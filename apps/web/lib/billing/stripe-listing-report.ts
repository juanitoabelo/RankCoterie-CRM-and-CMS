/**
 * Canopy V2 — Live Stripe pull for the listing subscription revenue report.
 *
 * Listing subscription payments are not mirrored into a local money table, so the
 * report reads actual collected/refunded amounts straight from Stripe. Invoices
 * are scoped to the subscription ids recorded on `ListingSubscription` rows; a
 * local-only fallback keeps the page working when Stripe is unconfigured.
 */
import Stripe from "stripe";
import { prisma, TENANT_ID } from "@/modules/shared";
import { readListingPaymentConfig, readStripeConfig } from "@/lib/billing/checkout";
import type { InvoiceLike } from "@/lib/billing/listing-revenue";

const MAX_INVOICES = 1000;
const MAX_REFUNDS = 1000;

// Stripe SDK v22 moved these fields off the typed surface (the API still returns
// them) — access through explicit casts, same as the webhook route.
type LegacyInvoice = {
  subscription?: string | null;
  parent?: { subscription_details?: { subscription?: string | null } | null } | null;
};

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as unknown as LegacyInvoice;
  const direct = typeof inv.subscription === "string" ? inv.subscription : null;
  const parent = inv.parent?.subscription_details?.subscription;
  return direct ?? (typeof parent === "string" ? parent : null);
}

function paymentIntentId(invoice: Stripe.Invoice): string | null {
  const pi = (invoice as unknown as { payment_intent?: string | { id: string } | null }).payment_intent;
  if (typeof pi === "string") return pi;
  return pi?.id ?? null;
}

/** Build a Stripe client from the listing payment config, gateway config, or env. */
export async function getListingStripe(): Promise<Stripe | null> {
  const tenant = await prisma.tenant
    .findUnique({ where: { id: TENANT_ID } })
    .catch(() => null);
  const listingCfg = readListingPaymentConfig(tenant?.theme ?? {});
  if (listingCfg?.secretKey) return new Stripe(listingCfg.secretKey);

  const gateway = await prisma.paymentGateway
    .findFirst({
      where: { tenantId: TENANT_ID, type: "STRIPE", isEnabled: true },
      orderBy: { createdAt: "asc" },
    })
    .catch(() => null);
  const gatewayCfg = gateway ? readStripeConfig(gateway.config) : null;
  if (gatewayCfg?.secretKey) return new Stripe(gatewayCfg.secretKey);

  const envKey = process.env.STRIPE_SECRET_KEY ?? null;
  return envKey ? new Stripe(envKey) : null;
}

export type StripeInvoiceResult = {
  configured: boolean;
  error: string | null;
  currency: string;
  invoices: InvoiceLike[];
};

/**
 * Fetch invoices + refunds for the given listing subscription ids.
 * Never throws — returns `error` so the report can degrade gracefully.
 */
export async function fetchListingInvoices(stripeSubIds: string[]): Promise<StripeInvoiceResult> {
  const empty: StripeInvoiceResult = { configured: false, error: null, currency: "usd", invoices: [] };
  const idSet = new Set(stripeSubIds.filter((id): id is string => Boolean(id)));
  if (idSet.size === 0) return { ...empty, configured: true };

  let stripe: Stripe | null;
  try {
    stripe = await getListingStripe();
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : "Stripe unavailable." };
  }
  if (!stripe) return empty;

  try {
    const invoices: InvoiceLike[] = [];
    const piToIndex = new Map<string, number>();
    let currency = "usd";

    for await (const inv of stripe.invoices.list({ limit: 100 })) {
      const subId = invoiceSubscriptionId(inv);
      if (!subId || !idSet.has(subId)) continue;
      currency = inv.currency ?? currency;
      invoices.push({
        id: inv.id,
        amountPaid: inv.amount_paid ?? 0,
        amountRefunded: 0,
        created: inv.created,
        status: inv.status ?? "open",
        subscriptionId: subId,
      });
      const pi = paymentIntentId(inv);
      if (pi) piToIndex.set(pi, invoices.length - 1);
      if (invoices.length >= MAX_INVOICES) break;
    }

    if (piToIndex.size > 0) {
      let seen = 0;
      for await (const refund of stripe.refunds.list({ limit: 100 })) {
        const pi = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id ?? null;
        const idx = pi ? piToIndex.get(pi) : undefined;
        if (idx !== undefined) {
          invoices[idx].amountRefunded = (invoices[idx].amountRefunded ?? 0) + (refund.amount ?? 0);
        }
        if (++seen >= MAX_REFUNDS) break;
      }
    }

    return { configured: true, error: null, currency, invoices };
  } catch (e) {
    return { ...empty, configured: true, error: e instanceof Error ? e.message : "Stripe request failed." };
  }
}

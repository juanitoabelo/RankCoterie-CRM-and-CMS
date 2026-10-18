/**
 * Client invoice payments — hosted Stripe Payment Links (test or live keys from
 * the CLIENT_BILLING gateway, never the storefront account) + the webhook side
 * (session → Invoice APPROVED) and the public pay page URL.
 *
 * Flow: admin clicks "Pay link" → Stripe Payment Link created with
 * metadata.invoiceId → stored on Invoice.payUrl (+ gatewayId) → client pays on
 * Stripe-hosted checkout → /api/webhooks/stripe (checkout.session.completed)
 * marks the Invoice APPROVED → client redirects back to /pay/<id>?status=done.
 */
import Stripe from "stripe";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { readStripeConfig } from "./checkout";
import { getGatewayForPurpose } from "./gateways";
import { activateListingFromInvoice } from "./listing-activation";

export type PaymentLinkResult =
  | { ok: true; url: string; reused: boolean }
  | { ok: false; error: string };

export function siteBaseUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/** Public, unauthenticated pay page for an invoice. */
export function payPageUrl(invoiceId: string): string {
  return `${siteBaseUrl()}/pay/${invoiceId}`;
}

/**
 * The gateway client payments run on:
 *  1. a gateway explicitly designated CLIENT_BILLING (separate account), else
 *  2. the only enabled Stripe gateway (single-account setups keep working
 *     until the admin splits purposes), else
 *  3. a clear error telling the admin to designate one.
 */
async function resolveClientBillingGateway() {
  const designated = await getGatewayForPurpose("CLIENT_BILLING");
  if (designated) return designated;

  const stripeGateways = await prisma.paymentGateway.findMany({
    where: { tenantId: TENANT_ID, type: "STRIPE", isEnabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  if (stripeGateways.length === 1) return stripeGateways[0];
  if (stripeGateways.length > 1) {
    return {
      error:
        "Multiple Stripe gateways are enabled but none is set to Client billing — set Purpose under Products → Payment Gateway so client payments use the right account.",
    };
  }
  return {
    error:
      'No enabled gateway is set up for client payments. Set a gateway\'s Purpose to "Client billing" under Products → Payment Gateway.',
  };
}

/**
 * Create (or reuse) the hosted payment link for an invoice.
 * Uses the enabled CLIENT_BILLING gateway — a different Stripe account from
 * e-commerce/listings is supported by setting a separate gateway row's purpose.
 */
export async function createInvoicePaymentLink(invoiceId: string): Promise<PaymentLinkResult> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "APPROVED") {
    return { ok: false, error: "Invoice is already paid." };
  }
  if (invoice.status === "REFUNDED" || invoice.status === "CHARGEDBACK") {
    return { ok: false, error: `Invoice is ${invoice.status.toLowerCase()} — create a new invoice instead.` };
  }
  if (invoice.payUrl) return { ok: true, url: invoice.payUrl, reused: true };

  const gateway = await resolveClientBillingGateway();
  if ("error" in gateway) return { ok: false, error: gateway.error };
  if (gateway.type !== "STRIPE") {
    return { ok: false, error: `Payment links need a Stripe gateway — "${gateway.name}" is ${gateway.type}.` };
  }
  const cfg = readStripeConfig(gateway.config);
  if (!cfg?.secretKey) {
    return { ok: false, error: `Gateway "${gateway.name}" has no Stripe secret key configured.` };
  }

  const cents = Math.round(Number(invoice.amount) * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    return { ok: false, error: "Invoice amount must be greater than zero." };
  }

  const stripe = new Stripe(cfg.secretKey);
  const clientName = [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" ");
  try {
    const link = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: cents,
            product_data: {
              name: `Invoice ${invoice.id.slice(-8)}${clientName ? ` — ${clientName}` : ""}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: { kind: "client_invoice", invoiceId: invoice.id, clientId: invoice.clientId },
      after_completion: {
        type: "redirect",
        redirect: { url: payPageUrl(invoice.id) },
      },
    });
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { payUrl: link.url, stripePaymentLinkId: link.id, gatewayId: gateway.id },
    });
    return { ok: true, url: link.url, reused: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe payment link creation failed." };
  }
}

/**
 * Best-effort: turn off the hosted Stripe payment link once an invoice is
 * paid (webhook or manual approve) — links are reusable by default, so an
 * active URL would allow charging the same invoice twice.
 */
export async function deactivateInvoicePaymentLink(invoice: {
  stripePaymentLinkId: string | null;
  gatewayId: string | null;
}): Promise<void> {
  if (!invoice.stripePaymentLinkId) return;
  const gateway = invoice.gatewayId
    ? await prisma.paymentGateway.findUnique({ where: { id: invoice.gatewayId } })
    : await getGatewayForPurpose("CLIENT_BILLING");
  const cfg = gateway ? readStripeConfig(gateway.config) : null;
  if (!cfg?.secretKey) return;
  try {
    await new Stripe(cfg.secretKey).paymentLinks.update(invoice.stripePaymentLinkId, {
      active: false,
    });
  } catch (e) {
    console.warn(`[client-payments] could not deactivate link ${invoice.stripePaymentLinkId}:`, e);
  }
}

/**
 * Webhook: a checkout session created from our payment link completed →
 * mark the invoice APPROVED. Returns true if the session belonged to an
 * invoice (even if already marked, for idempotent Stripe retries).
 */
export async function applyCheckoutSessionToInvoice(session: {
  id: string;
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id: string } | null;
}): Promise<boolean> {
  const invoiceId = session.metadata?.invoiceId;
  if (!invoiceId) return false;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return false;
  if (invoice.status === "APPROVED") return true; // idempotent

  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "APPROVED",
      paidAt: invoice.paidAt ?? new Date(),
      stripePaymentId: paymentIntent ?? invoice.stripePaymentId,
      responseMsg: `Paid via payment link (session ${session.id})`,
    },
  });
  await logAudit({
    action: "INVOICE_PAID",
    entity: "Invoice",
    entityId: invoice.id,
    reason: `Invoice paid via payment link — $${invoice.amount.toFixed(2)}`,
    meta: { sessionId: session.id, source: "stripe-webhook", paymentIntent },
  });

  await deactivateInvoicePaymentLink(invoice);
  // Company listing settlement — paid ⇒ the linked landing page goes LIVE.
  await activateListingFromInvoice(invoice, "stripe-payment-link").catch(() => false);
  return true;
}

/** Webhook: the payment link expired without payment — leave status, record why. */
export async function markInvoiceLinkExpired(invoiceId: string): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.status === "APPROVED") return;
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { responseMsg: "Payment link expired — create a new link to bill again" },
  });
}

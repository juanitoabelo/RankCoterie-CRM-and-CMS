/**
 * Canopy V2 — Stripe webhook: paid-listing fulfillment + billing lifecycle (§6.7.3.2, legacy §4.6).
 *
 * checkout.session.completed  → activate listing (LIVE) + create ListingSubscription
 * invoice.payment_failed      → dunning: SUSPENDED but visible through payment grace
 * invoice.payment_succeeded   → dunning recovery: restore LIVE + clear grace
 * customer.subscription.deleted → expire: SUSPENDED, no grace
 * charge.refunded             → mark Invoice REFUNDED + audit
 * charge.dispute.created      → mark Invoice CHARGEDBACK + audit
 *
 * Every transition writes an AuditLog row. The visibility gate (§6.7.3.1) then
 * naturally hides/exposes the listing based on status + grace windows.
 */
import Stripe from "stripe";
import { prisma, TENANT_ID } from "@/modules/shared";
import { readStripeConfig, readListingPaymentConfig } from "@/lib/billing/checkout";
import { logAudit } from "@/lib/audit";
import { markOrderPaid } from "@/lib/billing/payment-events";
import { sendPaymentFailedEmail } from "@/lib/email/orders";
// Dunning grace: listing stays visible for N days after the failed charge
// (README design decision #3: dunning → suspend → expire).
const DUNNING_GRACE_DAYS = 7;

// Secret key for API calls, refreshed from the gateway config (env fallback)
// at the start of each webhook request.
let stripeSecretKey: string | null = process.env.STRIPE_SECRET_KEY ?? null;

function stripe(): Stripe {
  if (!stripeSecretKey) throw new Error("Stripe is not configured.");
  return new Stripe(stripeSecretKey);
}

/** Load all configured Stripe credential sets (gateway config first, then listing payment config). */
async function loadStripeCredentialsCandidates(): Promise<{ secretKey: string; webhookSecret: string }[]> {
  const gateways = await prisma.paymentGateway.findMany({
    where: { tenantId: TENANT_ID, type: "STRIPE", isEnabled: true },
    orderBy: { createdAt: "asc" },
  });
  const candidates: { secretKey: string; webhookSecret: string }[] = [];
  for (const gateway of gateways) {
    const cfg = readStripeConfig(gateway.config);
    if (cfg?.secretKey && cfg?.webhookSecret) candidates.push({ secretKey: cfg.secretKey, webhookSecret: cfg.webhookSecret });
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } }).catch(() => null);
  const listingCfg = readListingPaymentConfig(tenant?.theme ?? {});
  if (listingCfg?.secretKey && listingCfg?.webhookSecret) {
    candidates.push({ secretKey: listingCfg.secretKey, webhookSecret: listingCfg.webhookSecret });
  }
  if (candidates.length === 0) {
    const secretKey = process.env.STRIPE_SECRET_KEY ?? null;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? null;
    if (secretKey && webhookSecret) return [{ secretKey, webhookSecret }];
  }
  // Deduplicate identical credentials (env fallbacks can overlap with gateway/listing config).
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const k = `${c.secretKey}|${c.webhookSecret}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Stripe SDK v22 dropped `current_period_end` / `Invoice.subscription` from its
// types (the API still returns them) — access via explicit casts.
type LegacySubscription = { current_period_end?: number };
type LegacyInvoice = { subscription?: string | null };

function currentPeriodEnd(sub: Stripe.Subscription): Date | null {
  const end = (sub as unknown as LegacySubscription).current_period_end;
  return end ? new Date(end * 1000) : null;
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return (invoice as unknown as LegacyInvoice).subscription ?? null;
}

/** Invoice matching for money-movement events (refunds/chargebacks). */
async function invoiceForPaymentIntent(paymentIntent: string | null) {
  if (!paymentIntent) return null;
  return prisma.invoice.findFirst({
    where: { OR: [{ stripePaymentId: paymentIntent }] },
    include: { client: true },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Product order (storefront checkout) — mark the order paid.
  const orderId = session.metadata?.orderId;
  if (orderId) {
    const found = await markOrderPaid(orderId, "stripe-webhook");
    if (!found) throw new Error(`Order not found: ${orderId}`);
    return;
  }

  const listingId = session.metadata?.listingId ?? session.client_reference_id;
  if (!listingId) throw new Error("Checkout session without listingId metadata");

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error(`Listing not found: ${listingId}`);

  const tier = (session.metadata?.tier ?? listing.tier) as "STANDARD" | "PREMIUM";
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  // Pull the subscription period so the listing knows its paid-until date.
  let periodEnd: Date | null = null;
  if (subscriptionId) {
    const sub = await stripe().subscriptions.retrieve(subscriptionId);
    periodEnd = currentPeriodEnd(sub);
  }

  await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listingId },
      data: { status: "LIVE", tier },
    });

    const data: Record<string, unknown> = {
      listingId,
      tier,
      status: "LIVE",
      stripeCustomerId: session.customer?.toString() ?? null,
      stripeSubId: subscriptionId ?? null,
      currentPeriodEnd: periodEnd,
      approvedAt: new Date(),
    };
    await tx.listingSubscription.upsert({
      where: { listingId },
      create: data as never,
      update: data as never,
    });
  });

  await logAudit({
    action: "LISTING_APPROVE",
    entity: "Listing",
    entityId: listingId,
    reason: "Paid via Stripe Checkout",
    meta: { tier, subscriptionId, source: "checkout.session.completed" },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const listingId = sub.metadata?.listingId;
  if (!listingId) return;

  const graceUntil = new Date(Date.now() + DUNNING_GRACE_DAYS * 86400000);
  await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listingId }, data: { status: "SUSPENDED" } });
    await tx.listingSubscription.updateMany({
      where: { listingId },
      data: { status: "SUSPENDED", paymentGraceUntil: graceUntil },
    });
  });
  await logAudit({
    action: "LISTING_SUSPEND",
    entity: "Listing",
    entityId: listingId,
    reason: `Payment failed — dunning grace until ${graceUntil.toISOString()}`,
    meta: { source: "invoice.payment_failed" },
  });

  // Send customer notification email about payment failure
  await sendPaymentFailedEmail(invoice, sub, listingId).catch(() => {});
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const listingId = subscription.metadata?.listingId;
  if (!listingId) return;

  await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listingId }, data: { status: "EXPIRED" } });
    await tx.listingSubscription.updateMany({
      where: { listingId },
      data: { status: "EXPIRED", paymentGraceUntil: null, canceledAt: new Date() },
    });
  });
  await logAudit({
    action: "LISTING_EXPIRE",
    entity: "Listing",
    entityId: listingId,
    reason: "Subscription cancelled/deleted — listing expired immediately",
    meta: { source: "customer.subscription.deleted" },
  });
}

/** Dunning recovery: a payment succeeded after a failure → clear the grace window. */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;

  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const listingId = sub.metadata?.listingId;
  if (!listingId) return;

  const listingSub = await prisma.listingSubscription.findUnique({ where: { listingId } });
  if (!listingSub || listingSub.status !== "SUSPENDED") return;

  const periodEnd = currentPeriodEnd(sub);
  await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listingId }, data: { status: "LIVE" } });
    await tx.listingSubscription.update({
      where: { listingId },
      data: { status: "LIVE", paymentGraceUntil: null, currentPeriodEnd: periodEnd },
    });
  });
  await logAudit({
    action: "LISTING_UPDATE",
    entity: "Listing",
    entityId: listingId,
    reason: "Payment succeeded — dunning cleared, listing reinstated",
    meta: { source: "invoice.payment_succeeded", subscriptionId },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntent =
    typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;
  const invoice = await invoiceForPaymentIntent(paymentIntent);
  if (!invoice) return;

  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "REFUNDED" } });
  await logAudit({
    action: "REFUND",
    entity: "Invoice",
    entityId: invoice.id,
    reason: `Charge ${charge.id} refunded for ${invoice.client.firstName} ${invoice.client.lastName}`.trim(),
    meta: { chargeId: charge.id, amount: charge.amount_refunded },
  });
}

async function handleChargeDisputeCreated(dispute: Stripe.Dispute) {
  const paymentIntent =
    typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id ?? null;
  const invoice = await invoiceForPaymentIntent(paymentIntent);
  if (!invoice) return;

  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "CHARGEDBACK" } });
  await logAudit({
    action: "CHARGEBACK",
    entity: "Invoice",
    entityId: invoice.id,
    reason: `Chargeback opened (${dispute.reason ?? "unknown"}) for invoice ${invoice.id}`,
    meta: { disputeId: dispute.id, reason: dispute.reason ?? null },
  });
}

export async function POST(req: Request) {
  const candidates = await loadStripeCredentialsCandidates();
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (candidates.length === 0 || !signature) {
    return new Response("Webhook not configured", { status: 400 });
  }

  let event: Stripe.Event | null = null;
  for (const candidate of candidates) {
    stripeSecretKey = candidate.secretKey;
    try {
      event = stripe().webhooks.constructEvent(payload, signature, candidate.webhookSecret);
      break;
    } catch {
      continue;
    }
  }
  if (!event) {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;
      case "charge.dispute.created":
        await handleChargeDisputeCreated(event.data.object);
        break;
      default:
        break; // acknowledged, no-op
    }
  } catch (e) {
    console.error(`[stripe-webhook] ${event.type} failed:`, e);
    // Return 200 to prevent infinite Stripe retries for non-retryable errors.
    // Retryable errors (network/DB timeouts) should throw to trigger Stripe retry.
    return new Response("ok", { status: 200 });
  }

  return new Response("ok", { status: 200 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
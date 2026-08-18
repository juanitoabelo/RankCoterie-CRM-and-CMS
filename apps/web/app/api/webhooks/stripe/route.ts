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
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

// Dunning grace: listing stays visible for N days after the failed charge
// (README design decision #3: dunning → suspend → expire).
const DUNNING_GRACE_DAYS = 7;

function stripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
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
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const listingId = subscription.metadata?.listingId;
  if (!listingId) return;

  await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listingId }, data: { status: "SUSPENDED" } });
    await tx.listingSubscription.updateMany({
      where: { listingId },
      data: { status: "SUSPENDED", paymentGraceUntil: null, canceledAt: new Date() },
    });
  });
  await logAudit({
    action: "LISTING_SUSPEND",
    entity: "Listing",
    entityId: listingId,
    reason: "Subscription cancelled/deleted",
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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) {
    return new Response("Webhook not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
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
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
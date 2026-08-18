/**
 * Canopy V2 — dunning sweep (legacy §4.6 → README decision #3).
 *
 * The Stripe side of dunning is Stripe's own (retries, escalation) and the webhook
 * marks listings SUSPENDED with a `paymentGraceUntil` (see /api/webhooks/stripe).
 * This sweep is the expiry half: once the grace window has passed without a
 * successful payment, the subscription expires and the listing goes EXPIRED.
 * Recovery happens earlier via `invoice.payment_succeeded` in the webhook.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export interface DunningSweepResult {
  expired: number;
  scanned: number;
}

export async function dunningSweep(now: Date = new Date()): Promise<DunningSweepResult> {
  const overdue = await prisma.listingSubscription.findMany({
    where: {
      status: "SUSPENDED",
      paymentGraceUntil: { not: null, lt: now },
    },
    select: { id: true, listingId: true, paymentGraceUntil: true },
  });

  for (const sub of overdue) {
    await prisma.$transaction(async (tx) => {
      await tx.listingSubscription.update({
        where: { id: sub.id },
        data: { status: "EXPIRED", paymentGraceUntil: null, canceledAt: now },
      });
      await tx.listing.update({
        where: { id: sub.listingId },
        data: { status: "EXPIRED" },
      });
    });
    await logAudit({
      action: "LISTING_EXPIRE",
      entity: "Listing",
      entityId: sub.listingId,
      reason: `Dunning grace expired (was ${sub.paymentGraceUntil?.toISOString()})`,
      meta: { source: "billing/dunning.run", subscriptionId: sub.id },
    });
  }

  return { expired: overdue.length, scanned: overdue.length };
}
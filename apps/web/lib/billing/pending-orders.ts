/**
 * Releasing reservations (stock + coupon usage) held by pending orders.
 *
 * Shared by the checkout actions (stale-token/rollback release), the checkout
 * cancel page, and the abandoned-order sweep (jobs/abandonedOrders via Inngest).
 * Every release is claim-guarded so retries and double-calls are safe.
 */
import { prisma, TENANT_ID } from "@/modules/shared";
import type { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { restoreStockForOrder } from "@/lib/billing/stock";

/**
 * Increment/decrement a coupon's usedCount (never below zero). Usage limits
 * are enforced in resolveCoupon against usedCount, so both directions matter.
 */
export async function adjustCouponUsage(code: string, delta: 1 | -1): Promise<void> {
  await prisma.coupon
    .updateMany({
      where: {
        code: { equals: code, mode: "insensitive" },
        tenantId: TENANT_ID,
        ...(delta < 0 ? { usedCount: { gte: 1 } } : {}),
      },
      data: { usedCount: { increment: delta } },
    })
    .catch(() => {});
}

/**
 * Give a pending order's coupon usage back. Claimed via meta.couponReleased
 * so repeated releases (double delete / stale+rollback) can't decrement twice.
 */
export async function releaseOrderCoupon(orderId: string): Promise<void> {
  const current = await prisma.order
    .findUnique({ where: { id: orderId }, select: { meta: true } })
    .catch(() => null);
  if (!current) return;
  const meta = (current.meta ?? {}) as Record<string, unknown>;

  const claimed = await prisma.order
    .updateMany({
      where: { id: orderId, NOT: { meta: { path: ["couponReleased"], equals: true } } },
      data: { meta: { ...meta, couponReleased: true } as Prisma.InputJsonValue },
    })
    .catch(() => ({ count: 0 }));
  if (claimed.count === 0) return;

  const code = typeof meta.couponCode === "string" ? meta.couponCode : null;
  if (code) await adjustCouponUsage(code, -1);
}

/**
 * Cancel a pending order and hand its reservations back (stock + coupon).
 * Idempotent: stock restore and coupon release are claim-guarded.
 */
export async function releasePendingOrder(orderId: string, reason: string): Promise<void> {
  await restoreStockForOrder(orderId).catch(() => {});
  await releaseOrderCoupon(orderId).catch(() => {});
  const current = await prisma.order
    .findUnique({ where: { id: orderId }, select: { meta: true } })
    .catch(() => null);
  if (!current) return;
  const meta = (current.meta ?? {}) as Record<string, unknown>;
  await prisma.order
    .update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        cancelledAt: new Date(),
        meta: { ...meta, cancelledReason: reason, pendingReleased: true } as Prisma.InputJsonValue,
      },
    })
    .catch(() => {});
}

export interface AbandonedReleaseResult {
  scanned: number;
  released: number;
}

/**
 * Cancel PENDING orders whose payment never arrived within the timeout and
 * release their stock + coupon usage. Runs on a cron (jobs/abandonedOrders).
 */
export async function releaseAbandonedOrders(now: Date = new Date()): Promise<AbandonedReleaseResult> {
  const minutes = Number(process.env.ABANDONED_ORDER_MINUTES ?? 60);
  const cutoff = new Date(now.getTime() - Math.max(5, minutes) * 60_000);
  const stale = await prisma.order.findMany({
    where: {
      tenantId: TENANT_ID,
      status: "PENDING",
      paymentStatus: "PENDING",
      createdAt: { lt: cutoff },
    },
    select: { id: true, orderNumber: true },
    take: 200,
  });

  for (const row of stale) {
    await releasePendingOrder(row.id, "abandoned-timeout").catch(() => {});
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: row.id,
      reason: "Abandoned pending order released (stock + coupon) after payment timeout",
      meta: { orderNumber: row.orderNumber, source: "abandoned-order-sweep" },
    }).catch(() => {});
  }

  return { scanned: stale.length, released: stale.length };
}

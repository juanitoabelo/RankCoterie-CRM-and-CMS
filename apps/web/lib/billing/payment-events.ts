import { prisma, TENANT_ID } from "@/modules/shared";
import {
  fulfillDigitalDownloadsForPaidOrder,
  fulfillSubscriptionsForPaidOrder,
} from "@/modules/ecommerce/queries";
import { logAudit } from "@/lib/audit";
import { restoreStockForOrder } from "@/lib/billing/stock";
import { releaseOrderCoupon } from "@/lib/billing/pending-orders";
import { sendOrderPaidEmail, sendOrderStatusEmail, toOrderEmailData } from "@/lib/email/orders";
import { logStructured } from "@/lib/observability";
import { logDownloadGrants, logPaymentStatus } from "@/lib/checkout/funnel-events";

/**
 * Mark an order as paid — the single authoritative path used by webhooks and
 * gateway return pages. Idempotent: a second call for an already-paid order
 * is a no-op, so gateway retries and double returns are safe.
 *
 * Returns false when the order does not exist (or belongs to another tenant).
 */
export async function markOrderPaid(orderId: string, source: string): Promise<boolean> {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!existing) return false;

  const claimed = await prisma.order.updateMany({
    where: { id: existing.id, tenantId: TENANT_ID, paymentStatus: { not: "PAID" } },
    data: { paymentStatus: "PAID", status: "PROCESSING", paidAt: new Date() },
  });
  if (claimed.count === 0) return true;
  logPaymentStatus({ orderId: existing.id, status: "PAID", gatewayType: source });

  const order = await prisma.order.findFirst({
    where: { id: existing.id, tenantId: TENANT_ID },
    include: { items: true },
  });
  if (!order) return true;

  await logAudit({
    action: "ORDER_PAID",
    entity: "Order",
    entityId: order.id,
    reason: `Paid via ${source}`,
    meta: { orderNumber: order.orderNumber, source },
  });
  try {
    await fulfillSubscriptionsForPaidOrder(order.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStructured({
      level: "error",
      message: "subscription_fulfillment_failed",
      context: { orderId: order.id, source, error: message },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: order.id,
      reason: "Subscription fulfillment failed after payment",
      meta: { orderNumber: order.orderNumber, source, error: message },
    }).catch(() => {});
  }
  let downloadLinks: Array<{ name: string; url: string }> = [];
  try {
    const grants = await fulfillDigitalDownloadsForPaidOrder(order.id);
    logDownloadGrants({ orderId: order.id, count: grants.length });
    downloadLinks = grants.map((grant) => ({
      name: grant.name,
      url: `/api/downloads/${grant.token}`,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStructured({
      level: "error",
      message: "digital_fulfillment_failed",
      context: { orderId: order.id, source, error: message },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: order.id,
      reason: "Digital fulfillment failed after payment",
      meta: { orderNumber: order.orderNumber, source, error: message },
    }).catch(() => {});
  }
  await sendOrderPaidEmail({ ...toOrderEmailData(order), downloadLinks }).catch(() => {});
  return true;
}

export async function markOrderPaymentFailed(
  orderId: string,
  source: string,
  reason: string,
): Promise<boolean> {
  const existing = await prisma.order.findFirst({
    where: { id: orderId, tenantId: TENANT_ID },
    select: { id: true, paymentStatus: true, status: true },
  });
  if (!existing) return false;
  if (existing.paymentStatus === "PAID" || existing.status === "COMPLETED") return true;

  const claimed = await prisma.order.updateMany({
    where: {
      id: existing.id,
      tenantId: TENANT_ID,
      paymentStatus: { notIn: ["PAID"] },
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    data: { paymentStatus: "FAILED", status: "FAILED" },
  });
  if (claimed.count === 0) return true;
  logPaymentStatus({ orderId: existing.id, status: "FAILED", gatewayType: source });

  await restoreStockForOrder(existing.id).catch(() => {});
  await releaseOrderCoupon(existing.id).catch(() => {});

  const order = await prisma.order
    .findFirst({
      where: { id: existing.id, tenantId: TENANT_ID },
      include: { items: true },
    })
    .catch(() => null);

  await logAudit({
    action: "ORDER_UPDATE",
    entity: "Order",
    entityId: existing.id,
    reason: `Payment failed via ${source}: ${reason}`,
    meta: { orderNumber: order?.orderNumber ?? null, source, reason },
  }).catch(() => {});

  if (order) {
    await sendOrderStatusEmail(toOrderEmailData(order), "FAILED").catch(() => {});
  }
  return true;
}

/** Find our order row by a gateway-side id stored in meta (paypalOrderId / squareOrderId). */
export async function findOrderByGatewayRef(
  key: "paypalOrderId" | "squareOrderId",
  value: string,
) {
  if (!value) return null;
  return prisma.order.findFirst({
    where: { tenantId: TENANT_ID, meta: { path: [key], equals: value } },
    select: { id: true, paymentStatus: true },
  });
}

import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { sendOrderPaidEmail, toOrderEmailData } from "@/lib/email/orders";

/**
 * Mark an order as paid — the single authoritative path used by webhooks and
 * gateway return pages. Idempotent: a second call for an already-paid order
 * is a no-op, so gateway retries and double returns are safe.
 *
 * Returns false when the order does not exist (or belongs to another tenant).
 */
export async function markOrderPaid(orderId: string, source: string): Promise<boolean> {
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId: TENANT_ID },
    include: { items: true },
  });
  if (!order) return false;
  if (order.paymentStatus === "PAID") return true;

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", status: "PROCESSING", paidAt: new Date() },
  });
  await logAudit({
    action: "ORDER_PAID",
    entity: "Order",
    entityId: order.id,
    reason: `Paid via ${source}`,
    meta: { orderNumber: order.orderNumber, source },
  });
  await sendOrderPaidEmail(toOrderEmailData(order)).catch(() => {});
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

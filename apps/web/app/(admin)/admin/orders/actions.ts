"use server";

import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { restoreStockForOrder } from "@/lib/billing/stock";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ORDER_STATUSES = ["PENDING", "PROCESSING", "ON_HOLD", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED"];
const PAYMENT_STATUSES = ["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"];

async function loadOrder(orderId: string) {
  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId: TENANT_ID } });
  return order;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  const actor = await requireSection("products");
  if (!ORDER_STATUSES.includes(status)) return { ok: false, error: "Invalid order status." };

  try {
    const order = await loadOrder(orderId);
    if (!order) return { ok: false, error: "Order not found." };
    if (order.status === status) return { ok: true };

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as never,
        ...(status === "COMPLETED" ? { completedAt: new Date() } : {}),
        ...(status === "CANCELLED" ? { cancelledAt: new Date() } : {}),
      },
    });
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      // Release reserved stock back to inventory (idempotent).
      await restoreStockForOrder(orderId).catch(() => {});
    }
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: orderId,
      reason: `Status ${order.status} → ${status}`,
      meta: { orderNumber: order.orderNumber, from: order.status, to: status },
      actorId: actor.id,
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update order status." };
  }
}

export async function updatePaymentStatus(orderId: string, paymentStatus: string): Promise<ActionResult> {
  const actor = await requireSection("products");
  if (!PAYMENT_STATUSES.includes(paymentStatus)) return { ok: false, error: "Invalid payment status." };

  try {
    const order = await loadOrder(orderId);
    if (!order) return { ok: false, error: "Order not found." };
    if (order.paymentStatus === paymentStatus) return { ok: true };

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: paymentStatus as never,
        ...(paymentStatus === "PAID" && order.paymentStatus !== "PAID" ? { paidAt: new Date() } : {}),
      },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: orderId,
      reason: `Payment ${order.paymentStatus} → ${paymentStatus}`,
      meta: { orderNumber: order.orderNumber, from: order.paymentStatus, to: paymentStatus, field: "paymentStatus" },
      actorId: actor.id,
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update payment status." };
  }
}

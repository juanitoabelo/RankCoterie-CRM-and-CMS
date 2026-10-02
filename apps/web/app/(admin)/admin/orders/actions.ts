"use server";

import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { restoreStockForOrder } from "@/lib/billing/stock";
import { refundOrderPayment } from "@/lib/billing/refunds";
import { sendOrderRefundEmail, sendOrderStatusEmail, toOrderEmailData } from "@/lib/email/orders";

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

    const updated = await prisma.order
      .findFirst({ where: { id: orderId, tenantId: TENANT_ID }, include: { items: true } })
      .catch(() => null);
    if (updated) {
      await sendOrderStatusEmail(toOrderEmailData(updated), status).catch(() => {});
    }

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

/**
 * Refund a paid order at its gateway, then mark it REFUNDED and release stock.
 * Idempotent: refunding an already-refunded order succeeds without side effects.
 */
export async function refundOrder(orderId: string): Promise<ActionResult> {
  const actor = await requireSection("products");
  try {
    const order = await loadOrder(orderId);
    if (!order) return { ok: false, error: "Order not found." };
    if (order.paymentStatus === "REFUNDED" || order.status === "REFUNDED") return { ok: true };
    if (order.paymentStatus !== "PAID") {
      return {
        ok: false,
        error:
          "Only paid orders can be refunded. If this order was settled offline, update the payment status to PAID first.",
      };
    }

    const refund = await refundOrderPayment(order);
    if (!refund.ok) return { ok: false, error: refund.error };

    const meta = (order.meta ?? {}) as Record<string, unknown>;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "REFUNDED",
        paymentStatus: "REFUNDED",
        meta: {
          ...meta,
          refundedAt: new Date().toISOString(),
          ...(refund.gatewayRefundId ? { refundId: refund.gatewayRefundId } : {}),
        } as never,
      },
    });
    // Hand reserved stock back to inventory (claim-first, idempotent).
    await restoreStockForOrder(orderId).catch(() => {});

    await logAudit({
      action: "REFUND",
      entity: "Order",
      entityId: orderId,
      reason: `Refunded via ${order.paymentMethod}`,
      meta: {
        orderNumber: order.orderNumber,
        total: order.total,
        gatewayRefundId: refund.gatewayRefundId ?? null,
      },
      actorId: actor.id,
    });

    const updated = await prisma.order
      .findFirst({ where: { id: orderId, tenantId: TENANT_ID }, include: { items: true } })
      .catch(() => null);
    if (updated) {
      await sendOrderRefundEmail(toOrderEmailData(updated)).catch(() => {});
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to refund order." };
  }
}

/** Save fulfillment details (carrier + tracking) into order.meta.fulfillment. */
export async function saveFulfillment(
  orderId: string,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("products");
  try {
    const order = await loadOrder(orderId);
    if (!order) return { ok: false, error: "Order not found." };

    const carrier = String(formData.get("carrier") ?? "").trim().slice(0, 120);
    const trackingNumber = String(formData.get("trackingNumber") ?? "").trim().slice(0, 120);
    const trackingUrl = String(formData.get("trackingUrl") ?? "").trim().slice(0, 500);

    if (!trackingNumber) return { ok: false, error: "Tracking number is required." };

    const meta = (order.meta ?? {}) as Record<string, unknown>;
    const previous = (meta.fulfillment ?? {}) as Record<string, unknown>;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: "shipped",
        meta: {
          ...meta,
          fulfillment: {
            ...previous,
            carrier,
            trackingNumber,
            trackingUrl,
            shippedAt: (previous.shippedAt as string | undefined) ?? new Date().toISOString(),
          },
        } as never,
      },
    });
    await logAudit({
      action: "ORDER_UPDATE",
      entity: "Order",
      entityId: orderId,
      reason: `Fulfillment saved (${carrier || "carrier unset"} · ${trackingNumber})`,
      meta: { orderNumber: order.orderNumber, carrier, trackingNumber },
      actorId: actor.id,
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save fulfillment." };
  }
}

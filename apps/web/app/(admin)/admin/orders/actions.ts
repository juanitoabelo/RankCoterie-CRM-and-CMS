"use server";

import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { restoreStockForOrder } from "@/lib/billing/stock";
import { refundOrderPayment, computeRefund } from "@/lib/billing/refunds";
import { sendOrderRefundEmail, sendOrderStatusEmail, toOrderEmailData } from "@/lib/email/orders";
import { markOrderPaid } from "@/lib/billing/payment-events";
import { getOrCreateCart } from "@/modules/ecommerce/queries";

export type ActionResult = { ok: true } | { ok: false; error: string };

const ORDER_STATUSES = ["PENDING", "PROCESSING", "ON_HOLD", "COMPLETED", "CANCELLED", "REFUNDED", "FAILED"];
const PAYMENT_STATUSES = ["PENDING", "AUTHORIZED", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"];

function isManualPayment(meta: unknown): boolean {
  return Boolean((meta as Record<string, unknown> | null)?.manualPayment === true);
}

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
    if (status === "CANCELLED" && isManualPayment(order.meta)) {
      return { ok: false, error: "Manual/offline orders cannot be cancelled." };
    }

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
    if (paymentStatus === "CANCELLED" && isManualPayment(order.meta)) {
      return { ok: false, error: "Manual/offline orders cannot be cancelled." };
    }

    if (paymentStatus === "PAID") {
      const paid = await markOrderPaid(orderId, "admin");
      if (!paid) return { ok: false, error: "Order not found." };
      await logAudit({
        action: "ORDER_UPDATE",
        entity: "Order",
        entityId: orderId,
        reason: `Payment ${order.paymentStatus} → PAID by admin`,
        meta: { orderNumber: order.orderNumber, from: order.paymentStatus, to: "PAID", field: "paymentStatus" },
        actorId: actor.id,
      });
      revalidatePath(`/admin/orders/${orderId}`);
      revalidatePath("/admin/orders");
      return { ok: true };
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: paymentStatus as never },
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
 * Refund an order at its gateway (full amount, or `amount` for a partial
 * refund), record a Refund row, and update the order's refunded amount.
 * Stock returns to inventory only when the order is fully refunded.
 * Guarded by computeRefund so double refunds cannot exceed what was paid.
 */
export async function refundOrder(
  orderId: string,
  amount?: number | null,
  reason?: string | null,
): Promise<ActionResult> {
  const actor = await requireSection("products");
  try {
    const order = await loadOrder(orderId);
    if (!order) return { ok: false, error: "Order not found." };
    if (order.paymentStatus === "REFUNDED" || order.status === "REFUNDED") {
      return { ok: false, error: "This order is already fully refunded." };
    }
    if (order.paymentStatus !== "PAID" && order.paymentStatus !== "PARTIALLY_REFUNDED") {
      return {
        ok: false,
        error:
          "Only paid orders can be refunded. If this order was settled offline, update the payment status to PAID first.",
      };
    }

    const computed = computeRefund(order, amount);
    if ("error" in computed) return { ok: false, error: computed.error };

    const refund = await refundOrderPayment(order, computed.amount);
    if (!refund.ok) return { ok: false, error: refund.error };

    const now = new Date();
    await prisma.refund.create({
      data: {
        orderId,
        amount: computed.amount,
        reason: reason?.trim() ? reason.trim().slice(0, 500) : null,
        status: "completed",
        gatewayRefundId: refund.gatewayRefundId ?? null,
        refundedById: actor.id,
        completedAt: now,
      },
    });

    const meta = (order.meta ?? {}) as Record<string, unknown>;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        refundedAmount: Math.round(((order.refundedAmount ?? 0) + computed.amount) * 100) / 100,
        ...(computed.isFull
          ? { status: "REFUNDED" as never, paymentStatus: "REFUNDED" as never }
          : { paymentStatus: "PARTIALLY_REFUNDED" as never }),
        meta: {
          ...meta,
          refundedAt: now.toISOString(),
          ...(refund.gatewayRefundId ? { refundId: refund.gatewayRefundId } : {}),
        } as never,
      },
    });
    // Only a full refund returns stock (claim-first, idempotent).
    if (computed.isFull) await restoreStockForOrder(orderId).catch(() => {});

    await logAudit({
      action: "REFUND",
      entity: "Order",
      entityId: orderId,
      reason: `Refunded $${computed.amount.toFixed(2)} via ${order.paymentMethod}`,
      meta: {
        orderNumber: order.orderNumber,
        total: order.total,
        refundedAmount: computed.amount,
        isFull: computed.isFull,
        gatewayRefundId: refund.gatewayRefundId ?? null,
      },
      actorId: actor.id,
    });

    const updated = await prisma.order
      .findFirst({ where: { id: orderId, tenantId: TENANT_ID }, include: { items: true } })
      .catch(() => null);
    if (updated) {
      await sendOrderRefundEmail(toOrderEmailData(updated), computed.amount).catch(() => {});
    }

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to refund order." };
  }
}

/** Save fulfillment details (carrier + tracking) into order.meta.fulfillment. */
export async function createRenewalOrder(subscriptionId: string): Promise<ActionResult & { orderId?: string }> {
  const actor = await requireSection("products");
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, tenantId: TENANT_ID },
      include: { product: true, variant: true, customer: true },
    });
    if (!subscription) return { ok: false, error: "Subscription not found." };
    if (!["active", "trialing", "past_due"].includes(subscription.status)) {
      return { ok: false, error: "Only active subscriptions can be renewed." };
    }

    const pending = await prisma.order.findFirst({
      where: {
        tenantId: TENANT_ID,
        paymentStatus: { in: ["PENDING", "AUTHORIZED"] },
        meta: { path: ["renewalSubscriptionId"], equals: subscription.id },
      },
      select: { id: true },
    });
    if (pending) return { ok: false, error: "A renewal order is already pending for this subscription." };

    const cart = await getOrCreateCart(`renewal:${subscription.id}:${Date.now()}`, subscription.customerId);
    const unitPrice = Number(subscription.amount ?? subscription.product.price ?? 0);
    const quantity = Math.max(1, subscription.quantity ?? 1);
    const name = subscription.variant?.name
      ? `${subscription.product.name} — ${subscription.variant.name}`
      : subscription.product.name;
    const interval = (subscription.interval ?? "month") as "day" | "week" | "month" | "year";
    const intervalCount = Math.max(1, subscription.intervalCount ?? 1);
    const now = new Date();
    const periodStart = subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
      ? subscription.currentPeriodEnd
      : now;
    const periodEnd = new Date(periodStart);
    if (interval === "day") periodEnd.setUTCDate(periodEnd.getUTCDate() + intervalCount);
    if (interval === "week") periodEnd.setUTCDate(periodEnd.getUTCDate() + intervalCount * 7);
    if (interval === "month") periodEnd.setUTCMonth(periodEnd.getUTCMonth() + intervalCount);
    if (interval === "year") periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + intervalCount);

    const order = await prisma.order.create({
      data: {
        tenantId: TENANT_ID,
        orderNumber: `REN-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        userId: subscription.customerId,
        customerId: subscription.customerId,
        guestEmail: subscription.customer.email ?? null,
        currency: subscription.currency || "USD",
        subtotal: unitPrice * quantity,
        discountTotal: 0,
        shippingTotal: 0,
        taxTotal: 0,
        total: unitPrice * quantity,
        status: "PENDING",
        paymentStatus: "PENDING",
        paymentMethod: "manual_renewal",
        paymentMethodTitle: "Manual Renewal",
        meta: {
          renewalSubscriptionId: subscription.id,
          renewalPlanKey: subscription.planKey,
          renewalPeriodStart: periodStart.toISOString(),
          renewalPeriodEnd: periodEnd.toISOString(),
          subscriptionPlans: [{
            productId: subscription.productId,
            variantId: subscription.variantId,
            amount: unitPrice,
            currency: subscription.currency || "USD",
            quantity,
            interval,
            intervalCount,
            length: (subscription.meta as Record<string, unknown> | null)?.plan
              ? Number(((subscription.meta as Record<string, unknown>).plan as Record<string, unknown>).length ?? 0) || null
              : null,
            trialPeriod: 0,
            signUpFee: 0,
          }],
        } as never,
        items: {
          create: [{
            productId: subscription.productId,
            variantId: subscription.variantId,
            name,
            sku: subscription.variant?.sku ?? subscription.product.sku,
            type: subscription.product.type,
            quantity,
            price: unitPrice,
            lineSubtotal: unitPrice * quantity,
            lineSubtotalTax: 0,
            lineTotal: unitPrice * quantity,
            lineTax: 0,
            meta: { renewalSubscriptionId: subscription.id } as never,
          }],
        },
      },
    });

    void cart;
    await logAudit({
      action: "ORDER_CREATE",
      entity: "Order",
      entityId: order.id,
      reason: `Renewal order created for subscription ${subscription.id}`,
      meta: { subscriptionId: subscription.id, orderNumber: order.orderNumber },
      actorId: actor.id,
    });
    revalidatePath(`/admin/orders/${order.id}`);
    revalidatePath("/admin/orders");
    return { ok: true, orderId: order.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create renewal order." };
  }
}

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

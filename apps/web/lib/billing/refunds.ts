/**
 * Gateway refunds — full refund of the captured payment for an order.
 * Resolution order: the gateway recorded on the order (paymentMethod),
 * with gateway credentials loaded from the tenant's PaymentGateway rows.
 */
import Stripe from "stripe";
import { prisma, TENANT_ID } from "@/modules/shared";
import { readStripeConfig } from "./checkout";
import { readPaypalConfig, refundPaypalOrder } from "./paypal";
import { readSquareConfig, refundSquareOrder } from "./square";

export type RefundResult = { ok: true; gatewayRefundId?: string } | { ok: false; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * How much of an order may be refunded right now. Passing no amount refunds
 * the full unrefunded balance. Never allows refunding more than paid.
 */
export function computeRefund(
  order: { total: number; refundedAmount?: number | null },
  amount?: number | null,
):
  | { amount: number; remaining: number; isFull: true }
  | { amount: number; remaining: number; isFull: false }
  | { error: string } {
  const remaining = round2(order.total - (order.refundedAmount ?? 0));
  if (remaining <= 0) {
    return { error: "This order has already been fully refunded." };
  }
  const requested = amount === null || amount === undefined ? remaining : round2(amount);
  if (!Number.isFinite(requested) || requested <= 0) {
    return { error: "Enter a refund amount greater than zero." };
  }
  if (requested > remaining + 0.01) {
    return {
      error: `Refund cannot exceed the unrefunded balance of $${remaining.toFixed(2)}.`,
    };
  }
  const isFull = requested >= remaining - 0.01;
  return { amount: isFull ? remaining : requested, remaining, isFull };
}

export async function refundOrderPayment(
  order: {
    paymentMethod: string | null;
    total: number;
    meta: unknown;
    paymentGatewayId: string | null;
  },
  amount?: number | null,
): Promise<RefundResult> {
  const meta = (order.meta ?? {}) as Record<string, unknown>;
  const refundAmount = amount === null || amount === undefined ? order.total : amount;

  switch (order.paymentMethod ?? "") {
    case "STRIPE": {
      const sessionId = typeof meta.stripeSessionId === "string" ? meta.stripeSessionId : "";
      if (!sessionId) {
        return {
          ok: false,
          error:
            "No Stripe checkout session recorded for this order (it may predate session tracking). Refund it from the Stripe dashboard, then set the payment status manually.",
        };
      }
      const gateway = order.paymentGatewayId
        ? await prisma.paymentGateway.findFirst({
            where: { id: order.paymentGatewayId, tenantId: TENANT_ID },
          })
        : null;
      const cfg = readStripeConfig(gateway?.config);
      if (!cfg) {
        return { ok: false, error: "Stripe is not configured (no gateway secret key)." };
      }
      try {
        const stripe = new Stripe(cfg.secretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        if (!paymentIntent) {
          return { ok: false, error: "Stripe session has no payment intent to refund." };
        }
        const refund = await stripe.refunds.create({
          payment_intent: paymentIntent,
          amount: Math.round(refundAmount * 100),
        });
        return { ok: true, gatewayRefundId: refund.id };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Stripe refund failed." };
      }
    }

    case "PAYPAL": {
      const paypalOrderId = typeof meta.paypalOrderId === "string" ? meta.paypalOrderId : "";
      if (!paypalOrderId) {
        return { ok: false, error: "No PayPal order id recorded for this order." };
      }
      const gateway = order.paymentGatewayId
        ? await prisma.paymentGateway.findFirst({
            where: { id: order.paymentGatewayId, tenantId: TENANT_ID },
          })
        : null;
      const cfg = gateway ? readPaypalConfig(gateway.config) : null;
      if (!cfg) return { ok: false, error: "PayPal gateway credentials are missing." };
      return refundPaypalOrder(cfg, paypalOrderId, Math.round(refundAmount * 100));
    }

    case "SQUARE": {
      const squareOrderId = typeof meta.squareOrderId === "string" ? meta.squareOrderId : "";
      if (!squareOrderId) {
        return { ok: false, error: "No Square order id recorded for this order." };
      }
      const gateway = order.paymentGatewayId
        ? await prisma.paymentGateway.findFirst({
            where: { id: order.paymentGatewayId, tenantId: TENANT_ID },
          })
        : null;
      const cfg = gateway ? readSquareConfig(gateway.config) : null;
      if (!cfg) return { ok: false, error: "Square gateway credentials are missing." };
      return refundSquareOrder(cfg, squareOrderId, Math.round(refundAmount * 100));
    }

    case "MANUAL":
      // Offline payment — nothing to refund at a gateway.
      return { ok: true };

    default:
      return {
        ok: false,
        error: `No refund handler for payment method "${order.paymentMethod ?? "unknown"}".`,
      };
  }
}

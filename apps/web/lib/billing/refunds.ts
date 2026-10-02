/**
 * Gateway refunds — full refund of the captured payment for an order.
 * Resolution order: the gateway recorded on the order (paymentMethod),
 * with gateway credentials loaded from the tenant's PaymentGateway rows.
 */
import Stripe from "stripe";
import { prisma, TENANT_ID } from "@/modules/shared";
import { readPaypalConfig, refundPaypalOrder } from "./paypal";
import { readSquareConfig, refundSquareOrder } from "./square";

export type RefundResult = { ok: true; gatewayRefundId?: string } | { ok: false; error: string };

export async function refundOrderPayment(order: {
  paymentMethod: string | null;
  total: number;
  meta: unknown;
  paymentGatewayId: string | null;
}): Promise<RefundResult> {
  const meta = (order.meta ?? {}) as Record<string, unknown>;

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
      if (!process.env.STRIPE_SECRET_KEY) {
        return { ok: false, error: "Stripe is not configured (STRIPE_SECRET_KEY missing)." };
      }
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null;
        if (!paymentIntent) {
          return { ok: false, error: "Stripe session has no payment intent to refund." };
        }
        const refund = await stripe.refunds.create({ payment_intent: paymentIntent });
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
      return refundPaypalOrder(cfg, paypalOrderId);
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
      return refundSquareOrder(cfg, squareOrderId, Math.round(order.total * 100));
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

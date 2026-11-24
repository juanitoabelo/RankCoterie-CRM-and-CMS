import type Stripe from "stripe";

export function buildStripeOrderSessionParams(input: {
  orderId: string;
  orderNumber: string;
  total: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: Math.round(input.total * 100),
          product_data: { name: `Order ${input.orderNumber}` },
        },
      },
    ],
    metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  };
}

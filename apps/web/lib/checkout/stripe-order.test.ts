import { describe, expect, it } from "vitest";
import { buildStripeOrderSessionParams } from "./stripe-order";

describe("buildStripeOrderSessionParams", () => {
  it("charges the authoritative order total, not just item unit prices", () => {
    const params = buildStripeOrderSessionParams({
      orderId: "ord_1",
      orderNumber: "CNP-1001",
      total: 42.75,
      currency: "USD",
      successUrl: "https://example.com/checkout/success?orderId=ord_1",
      cancelUrl: "https://example.com/checkout/cancel?orderId=ord_1",
    });

    expect(params.line_items).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 4275,
          product_data: { name: "Order CNP-1001" },
        },
      },
    ]);
    expect(params.metadata).toEqual({ orderId: "ord_1", orderNumber: "CNP-1001" });
    expect(params.success_url).toContain("orderId=ord_1");
  });
});

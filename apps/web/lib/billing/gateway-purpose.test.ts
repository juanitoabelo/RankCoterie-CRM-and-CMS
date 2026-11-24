import { beforeEach, describe, expect, it, vi } from "vitest";

const gatewayFindFirst = vi.fn();

vi.mock("@/modules/shared", () => ({
  prisma: { paymentGateway: { findFirst: (...args: unknown[]) => gatewayFindFirst(...args) } },
  TENANT_ID: "tenant-test",
}));
vi.mock("stripe", () => ({ default: class StripeMock { checkout = { sessions: { retrieve: vi.fn() } }; refunds = { create: vi.fn() }; } }));
vi.mock("./checkout", () => ({ readStripeConfig: vi.fn(() => ({ secretKey: "sk_test" })) }));
vi.mock("./paypal", () => ({ readPaypalConfig: vi.fn(() => ({ clientId: "x", clientSecret: "y" })), refundPaypalOrder: vi.fn(async () => ({ ok: true })) }));
vi.mock("./square", () => ({ readSquareConfig: vi.fn(() => ({ accessToken: "x" })), refundSquareOrder: vi.fn(async () => ({ ok: true })) }));

import { refundOrderPayment } from "./refunds";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("gateway purpose enforcement", () => {
  it("rejects storefront refunds for client-billing gateways", async () => {
    gatewayFindFirst.mockResolvedValue({ id: "gw_1", purpose: "CLIENT_BILLING", config: {} });
    const result = await refundOrderPayment({
      paymentMethod: "STRIPE",
      total: 20,
      paymentGatewayId: "gw_1",
      meta: { stripeSessionId: "cs_1" },
    }, 20);
    expect(result).toEqual({ ok: false, error: "This order's payment gateway is not configured for storefront refunds." });
  });

  it("rejects storefront refunds for listing gateways", async () => {
    gatewayFindFirst.mockResolvedValue({ id: "gw_1", purpose: "LISTING", config: {} });
    const result = await refundOrderPayment({
      paymentMethod: "PAYPAL",
      total: 20,
      paymentGatewayId: "gw_1",
      meta: { paypalOrderId: "pp_1" },
    }, 20);
    expect(result.ok).toBe(false);
  });

  it("allows ecommerce gateway refunds", async () => {
    gatewayFindFirst.mockResolvedValue({ id: "gw_1", purpose: "ECOMMERCE", config: {} });
    const result = await refundOrderPayment({
      paymentMethod: "MANUAL",
      total: 20,
      paymentGatewayId: "gw_1",
      meta: {},
    }, 20);
    expect(result).toEqual({ ok: true });
  });
});

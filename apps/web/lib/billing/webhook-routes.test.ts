import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn();
const orderFindFirst = vi.fn();
const paymentGatewayFindMany = vi.fn();
const paymentGatewayFindFirst = vi.fn();
const tenantFindUnique = vi.fn();
const markOrderPaid = vi.fn();
const markOrderPaymentFailed = vi.fn();
const recordGatewayTransaction = vi.fn();
const claimWebhookEvent = vi.fn();
const logWebhookMismatch = vi.fn();
const logStructured = vi.fn();
const logAudit = vi.fn();
const readStripeConfig = vi.fn();
const readListingPaymentConfig = vi.fn();
const readCompanyListingPaymentConfig = vi.fn();
const readPaypalConfig = vi.fn();
const verifyPaypalWebhookSignature = vi.fn();
const readSquareConfig = vi.fn();
const getSquareOrderState = vi.fn();
const applyCheckoutSessionToInvoice = vi.fn();
const markInvoiceLinkExpired = vi.fn();
const sendPaymentFailedEmail = vi.fn();

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: (...args: unknown[]) => constructEvent(...args) };
    subscriptions = { retrieve: vi.fn() };
  },
}));

vi.mock("@/modules/shared", () => ({
  TENANT_ID: "tenant-test",
  prisma: {
    order: { findFirst: (...args: unknown[]) => orderFindFirst(...args) },
    paymentGateway: {
      findMany: (...args: unknown[]) => paymentGatewayFindMany(...args),
      findFirst: (...args: unknown[]) => paymentGatewayFindFirst(...args),
    },
    tenant: { findUnique: (...args: unknown[]) => tenantFindUnique(...args) },
  },
}));

vi.mock("@/lib/billing/checkout", () => ({
  readStripeConfig: (...args: unknown[]) => readStripeConfig(...args),
  readListingPaymentConfig: (...args: unknown[]) => readListingPaymentConfig(...args),
  readCompanyListingPaymentConfig: (...args: unknown[]) => readCompanyListingPaymentConfig(...args),
}));
vi.mock("@/lib/billing/paypal", () => ({
  readPaypalConfig: (...args: unknown[]) => readPaypalConfig(...args),
  verifyPaypalWebhookSignature: (...args: unknown[]) => verifyPaypalWebhookSignature(...args),
}));
vi.mock("@/lib/billing/square", () => ({
  readSquareConfig: (...args: unknown[]) => readSquareConfig(...args),
  getSquareOrderState: (...args: unknown[]) => getSquareOrderState(...args),
}));
vi.mock("@/lib/billing/payment-events", () => ({
  markOrderPaid: (...args: unknown[]) => markOrderPaid(...args),
  markOrderPaymentFailed: (...args: unknown[]) => markOrderPaymentFailed(...args),
}));
vi.mock("@/lib/billing/client-payments", () => ({
  applyCheckoutSessionToInvoice: (...args: unknown[]) => applyCheckoutSessionToInvoice(...args),
  markInvoiceLinkExpired: (...args: unknown[]) => markInvoiceLinkExpired(...args),
}));
vi.mock("@/lib/billing/gateway-transactions", () => ({
  recordGatewayTransaction: (...args: unknown[]) => recordGatewayTransaction(...args),
}));
vi.mock("@/lib/billing/webhook-events", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/webhook-events")>();
  return {
    ...actual,
    claimWebhookEvent: (...args: unknown[]) => claimWebhookEvent(...args),
    logWebhookMismatch: (...args: unknown[]) => logWebhookMismatch(...args),
  };
});
vi.mock("@/lib/observability", () => ({
  logStructured: (...args: unknown[]) => logStructured(...args),
}));
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => logAudit(...args),
}));
vi.mock("@/lib/email/orders", () => ({
  sendPaymentFailedEmail: (...args: unknown[]) => sendPaymentFailedEmail(...args),
}));

import { POST as stripePost } from "../../app/api/webhooks/stripe/route";
import { POST as paypalPost } from "../../app/api/webhooks/paypal/route";
import { POST as squarePost } from "../../app/api/webhooks/square/route";

const order = {
  id: "ord_1",
  total: 20,
  currency: "USD",
  paymentGatewayId: "gw_1",
  paymentStatus: "PENDING",
};

function stripeEvent(object: Record<string, unknown>) {
  return {
    id: "evt_stripe_1",
    type: "checkout.session.completed",
    data: { object },
  };
}

function stripeRequest(event: unknown) {
  constructEvent.mockReturnValue(event);
  return new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": "sig" },
    body: "raw",
  });
}

function paypalRequest(event: unknown) {
  return new Request("http://localhost/api/webhooks/paypal", {
    method: "POST",
    body: JSON.stringify(event),
  });
}

function squareRequest(event: unknown) {
  const raw = JSON.stringify(event);
  const signature = crypto
    .createHmac("sha256", "square-signature-key")
    .update(`http://localhost:3000/api/webhooks/square${raw}`)
    .digest("base64");
  return new Request("http://localhost/api/webhooks/square", {
    method: "POST",
    headers: { "x-square-hmacsha256-signature": signature },
    body: raw,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  paymentGatewayFindMany.mockResolvedValue([{ config: {} }]);
  paymentGatewayFindFirst.mockResolvedValue({
    config: { webhookId: "wh_1", signatureKey: "square-signature-key" },
  });
  tenantFindUnique.mockResolvedValue(null);
  readStripeConfig.mockReturnValue({ secretKey: "sk_test", webhookSecret: "whsec_test" });
  readListingPaymentConfig.mockReturnValue(null);
  readCompanyListingPaymentConfig.mockReturnValue({ secretKey: "", webhookSecret: "" });
  readPaypalConfig.mockReturnValue({ clientId: "id", clientSecret: "secret", sandbox: true });
  verifyPaypalWebhookSignature.mockResolvedValue(true);
  readSquareConfig.mockReturnValue({ applicationId: "app", accessToken: "token", locationId: "loc" });
  orderFindFirst.mockResolvedValue(order);
  markOrderPaid.mockResolvedValue(true);
  markOrderPaymentFailed.mockResolvedValue(true);
  recordGatewayTransaction.mockResolvedValue(true);
  claimWebhookEvent.mockResolvedValue(true);
  logWebhookMismatch.mockResolvedValue(undefined);
  logStructured.mockReturnValue(undefined);
  logAudit.mockResolvedValue(undefined);
  getSquareOrderState.mockResolvedValue({ ok: true, state: "COMPLETED", paid: true, amount: 2000, currency: "USD" });
});

describe("Stripe webhook", () => {
  it("marks an order paid when the captured total and currency match", async () => {
    const response = await stripePost(
      stripeRequest(
        stripeEvent({
          id: "cs_1",
          metadata: { orderId: "ord_1" },
          amount_total: 2000,
          currency: "usd",
          payment_status: "paid",
          payment_intent: "pi_1",
        }),
      ),
    );
    expect(response.status).toBe(200);
    expect(markOrderPaid).toHaveBeenCalledWith("ord_1", "stripe-webhook");
    expect(recordGatewayTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 20, currency: "USD", gatewayTransactionId: "pi_1" }),
    );
  });

  it("acknowledges a mismatched amount without marking paid", async () => {
    const response = await stripePost(
      stripeRequest(
        stripeEvent({
          id: "cs_1",
          metadata: { orderId: "ord_1" },
          amount_total: 1000,
          currency: "usd",
          payment_status: "paid",
        }),
      ),
    );
    expect(response.status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(logWebhookMismatch).toHaveBeenCalledWith(
      expect.objectContaining({ gateway: "stripe", reason: "amount_mismatch" }),
    );
  });

  it("returns 500 for retryable processing failures", async () => {
    markOrderPaid.mockRejectedValue(new Error("db down"));
    const response = await stripePost(
      stripeRequest(
        stripeEvent({
          id: "cs_1",
          metadata: { orderId: "ord_1" },
          amount_total: 2000,
          currency: "usd",
          payment_status: "paid",
        }),
      ),
    );
    expect(response.status).toBe(500);
    expect(logStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "webhook_processing_failed",
        context: expect.objectContaining({ retryable: true }),
      }),
    );
  });

  it("does not mark an unknown order paid and does not retry it", async () => {
    orderFindFirst.mockResolvedValue(null);
    const response = await stripePost(
      stripeRequest(
        stripeEvent({
          id: "cs_1",
          metadata: { orderId: "missing" },
          amount_total: 2000,
          currency: "usd",
          payment_status: "paid",
        }),
      ),
    );
    expect(response.status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("skips duplicate events", async () => {
    claimWebhookEvent.mockResolvedValue(false);
    const response = await stripePost(
      stripeRequest(
        stripeEvent({
          id: "cs_1",
          metadata: { orderId: "ord_1" },
          amount_total: 2000,
          currency: "usd",
          payment_status: "paid",
        }),
      ),
    );
    expect(response.status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
  });
});

describe("PayPal webhook", () => {
  const captureEvent = (amount: string, currencyCode: string) => ({
    id: "evt_paypal_1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    data: {
      resource: {
        id: "capture_1",
        custom_id: "ord_1",
        amount: { value: amount, currency_code: currencyCode },
      },
    },
  });

  it("marks paid only when the capture matches the order total", async () => {
    const response = await paypalPost(paypalRequest(captureEvent("20.00", "USD")));
    expect(response.status).toBe(200);
    expect(markOrderPaid).toHaveBeenCalledWith("ord_1", "paypal-webhook");
    expect(recordGatewayTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 20, currency: "USD", gatewayTransactionId: "capture_1" }),
    );
  });

  it("acknowledges but ignores a mismatched capture", async () => {
    const response = await paypalPost(paypalRequest(captureEvent("12.00", "USD")));
    expect(response.status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(logWebhookMismatch).toHaveBeenCalledWith(
      expect.objectContaining({ gateway: "paypal", reason: "amount_mismatch" }),
    );
  });
});

describe("Square webhook", () => {
  const orderEvent = (amount: number, currency: string) => ({
    id: "evt_square_1",
    type: "order.updated",
    data: { object: { order: { id: "sq_1", total_money: { amount, currency } } } },
  });

  it("marks paid only when Square reports the order total", async () => {
    const response = await squarePost(squareRequest(orderEvent(2000, "USD")));
    expect(response.status).toBe(200);
    expect(markOrderPaid).toHaveBeenCalledWith("ord_1", "square-webhook");
  });

  it("rejects a mismatched Square amount without marking paid", async () => {
    const response = await squarePost(squareRequest(orderEvent(500, "USD")));
    expect(response.status).toBe(200);
    expect(markOrderPaid).not.toHaveBeenCalled();
    expect(logWebhookMismatch).toHaveBeenCalledWith(
      expect.objectContaining({ gateway: "square", reason: "amount_mismatch" }),
    );
  });
});

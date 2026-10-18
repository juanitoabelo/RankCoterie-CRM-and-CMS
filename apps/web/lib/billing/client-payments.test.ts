import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const h = vi.hoisted(() => ({
  invoiceFindUnique: vi.fn(),
  invoiceUpdate: vi.fn(),
  invoiceCreate: vi.fn(),
  gwFindFirst: vi.fn(),
  gwFindMany: vi.fn(),
  gwFindUnique: vi.fn(),
  stripeCreate: vi.fn(),
  stripeUpdate: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/modules/shared", () => ({
  prisma: {
    invoice: {
      findUnique: h.invoiceFindUnique,
      update: h.invoiceUpdate,
      create: h.invoiceCreate,
    },
    paymentGateway: {
      findFirst: h.gwFindFirst,
      findMany: h.gwFindMany,
      findUnique: h.gwFindUnique,
    },
  },
  TENANT_ID: "tenant-test",
}));
vi.mock("@/lib/audit", () => ({ logAudit: h.logAudit }));
vi.mock("stripe", () => ({
  default: class StripeMock {
    paymentLinks = { create: h.stripeCreate, update: h.stripeUpdate };
  },
}));

import {
  applyCheckoutSessionToInvoice,
  createInvoicePaymentLink,
  markInvoiceLinkExpired,
  payPageUrl,
} from "./client-payments";

const stripeGateway = (overrides: Record<string, unknown> = {}) => ({
  id: "gw_client_billing",
  tenantId: "tenant-test",
  type: "STRIPE",
  purpose: "CLIENT_BILLING",
  name: "Client Billing Stripe",
  isEnabled: true,
  config: { secretKey: "sk_test_secret" },
  ...overrides,
});

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv_1234567890",
    clientId: "client_1",
    merchantId: null,
    amount: new Prisma.Decimal("97.00"),
    chargeDate: new Date(),
    status: "ATTEMPTED",
    isRecurring: false,
    interval: null,
    retries: 0,
    stripePaymentId: null,
    gatewayId: null,
    payUrl: null,
    stripePaymentLinkId: null,
    paidAt: null,
    emailSentAt: null,
    responseMsg: null,
    createdAt: new Date(),
    client: {
      id: "client_1",
      firstName: "Fatima",
      lastName: "Al-Rashid",
      email: "fatima@example.com",
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createInvoicePaymentLink", () => {
  it("creates a Stripe payment link on the CLIENT_BILLING gateway and stores it", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow());
    h.gwFindFirst.mockResolvedValue(stripeGateway());
    h.stripeCreate.mockResolvedValue({ id: "plink_1", url: "https://buy.stripe.com/test_abc" });
    h.invoiceUpdate.mockResolvedValue({});

    const result = await createInvoicePaymentLink("inv_1234567890");

    expect(result).toEqual({ ok: true, url: "https://buy.stripe.com/test_abc", reused: false });
    expect(h.gwFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ purpose: "CLIENT_BILLING", isEnabled: true }),
      }),
    );
    const stripeArgs = h.stripeCreate.mock.calls[0][0];
    expect(stripeArgs.line_items[0].price_data.unit_amount).toBe(9700);
    expect(stripeArgs.metadata).toMatchObject({
      kind: "client_invoice",
      invoiceId: "inv_1234567890",
      clientId: "client_1",
    });
    expect(stripeArgs.after_completion.redirect.url).toBe(payPageUrl("inv_1234567890"));
    expect(h.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: "inv_1234567890" },
      data: {
        payUrl: "https://buy.stripe.com/test_abc",
        stripePaymentLinkId: "plink_1",
        gatewayId: "gw_client_billing",
      },
    });
  });

  it("reuses an existing pay link without calling Stripe", async () => {
    h.invoiceFindUnique.mockResolvedValue(
      invoiceRow({ payUrl: "https://buy.stripe.com/existing" }),
    );

    const result = await createInvoicePaymentLink("inv_1234567890");

    expect(result).toEqual({ ok: true, url: "https://buy.stripe.com/existing", reused: true });
    expect(h.stripeCreate).not.toHaveBeenCalled();
    expect(h.invoiceUpdate).not.toHaveBeenCalled();
  });

  it("rejects an invoice that is already paid", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow({ status: "APPROVED" }));
    const result = await createInvoicePaymentLink("inv_1234567890");
    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toContain("already paid");
    expect(h.stripeCreate).not.toHaveBeenCalled();
  });

  it("falls back to the only enabled Stripe gateway when none is designated", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow());
    h.gwFindFirst.mockResolvedValue(null); // no CLIENT_BILLING gateway
    h.gwFindMany.mockResolvedValue([stripeGateway({ id: "gw_only", purpose: "GENERAL" })]);
    h.stripeCreate.mockResolvedValue({ id: "plink_2", url: "https://buy.stripe.com/test_fallback" });
    h.invoiceUpdate.mockResolvedValue({});

    const result = await createInvoicePaymentLink("inv_1234567890");

    expect(result).toMatchObject({ ok: true, url: "https://buy.stripe.com/test_fallback" });
    expect(h.invoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ gatewayId: "gw_only" }) }),
    );
  });

  it("errors when several Stripe gateways exist and none is set to Client billing", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow());
    h.gwFindFirst.mockResolvedValue(null);
    h.gwFindMany.mockResolvedValue([
      stripeGateway({ id: "gw_a", purpose: "ECOMMERCE" }),
      stripeGateway({ id: "gw_b", purpose: "LISTING" }),
    ]);

    const result = await createInvoicePaymentLink("inv_1234567890");

    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toContain("Client billing");
    expect(h.stripeCreate).not.toHaveBeenCalled();
  });

  it("errors with setup guidance when no Stripe gateway is configured", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow());
    h.gwFindFirst.mockResolvedValue(null);
    h.gwFindMany.mockResolvedValue([]);

    const result = await createInvoicePaymentLink("inv_1234567890");

    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toContain("Purpose");
  });

  it("rejects a non-Stripe designated gateway", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow());
    h.gwFindFirst.mockResolvedValue(stripeGateway({ type: "MANUAL", name: "Offline" }));

    const result = await createInvoicePaymentLink("inv_1234567890");

    expect(result).toMatchObject({ ok: false });
    expect((result as { error: string }).error).toContain("Stripe gateway");
  });

  it("surfaces Stripe API errors", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow());
    h.gwFindFirst.mockResolvedValue(stripeGateway());
    h.stripeCreate.mockRejectedValue(new Error("Invalid API Key"));

    const result = await createInvoicePaymentLink("inv_1234567890");

    expect(result).toEqual({ ok: false, error: "Invalid API Key" });
    expect(h.invoiceUpdate).not.toHaveBeenCalled();
  });
});

describe("applyCheckoutSessionToInvoice", () => {
  it("marks the invoice APPROVED with the payment intent and audits", async () => {
    h.invoiceFindUnique.mockResolvedValue(
      invoiceRow({ stripePaymentLinkId: "plink_1", gatewayId: "gw_client_billing" }),
    );
    h.invoiceUpdate.mockResolvedValue({});
    h.gwFindUnique.mockResolvedValue(stripeGateway());

    const applied = await applyCheckoutSessionToInvoice({
      id: "cs_1",
      metadata: { invoiceId: "inv_1234567890", kind: "client_invoice" },
      payment_intent: "pi_123",
    });

    expect(applied).toBe(true);
    expect(h.invoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          stripePaymentId: "pi_123",
          paidAt: expect.any(Date),
        }),
      }),
    );
    expect(h.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_PAID", entityId: "inv_1234567890" }),
    );
    // link deactivated so the reusable URL can't be charged twice
    expect(h.stripeUpdate).toHaveBeenCalledWith("plink_1", { active: false });
  });

  it("ignores sessions that are not invoice payments", async () => {
    const applied = await applyCheckoutSessionToInvoice({
      id: "cs_2",
      metadata: { orderId: "order_1" },
    });
    expect(applied).toBe(false);
    expect(h.invoiceFindUnique).not.toHaveBeenCalled();
  });

  it("is idempotent for an already-approved invoice", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow({ status: "APPROVED" }));

    const applied = await applyCheckoutSessionToInvoice({
      id: "cs_3",
      metadata: { invoiceId: "inv_1234567890" },
    });

    expect(applied).toBe(true);
    expect(h.invoiceUpdate).not.toHaveBeenCalled();
    expect(h.logAudit).not.toHaveBeenCalled();
  });

  it("deactivates the link best-effort even without a stored gateway id", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow({ stripePaymentLinkId: "plink_2" }));
    h.invoiceUpdate.mockResolvedValue({});
    h.gwFindFirst.mockResolvedValue(stripeGateway());

    await applyCheckoutSessionToInvoice({
      id: "cs_4",
      metadata: { invoiceId: "inv_1234567890" },
      payment_intent: null,
    });

    expect(h.gwFindFirst).toHaveBeenCalled(); // purpose fallback lookup
    expect(h.stripeUpdate).toHaveBeenCalledWith("plink_2", { active: false });
  });
});

describe("markInvoiceLinkExpired", () => {
  it("records why an unpaid invoice's link expired", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow());
    h.invoiceUpdate.mockResolvedValue({});

    await markInvoiceLinkExpired("inv_1234567890");

    expect(h.invoiceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { responseMsg: expect.stringContaining("expired") },
      }),
    );
  });

  it("leaves paid invoices untouched", async () => {
    h.invoiceFindUnique.mockResolvedValue(invoiceRow({ status: "APPROVED" }));
    await markInvoiceLinkExpired("inv_1234567890");
    expect(h.invoiceUpdate).not.toHaveBeenCalled();
  });
});

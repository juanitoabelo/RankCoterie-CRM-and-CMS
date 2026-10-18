import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

const h = vi.hoisted(() => ({
  invoiceFindMany: vi.fn(),
  invoiceCreate: vi.fn(),
  invoiceUpdate: vi.fn(),
  logAudit: vi.fn(),
  createInvoicePaymentLink: vi.fn(),
  sendInvoicePaymentEmail: vi.fn(),
}));

vi.mock("@/modules/shared", () => ({
  prisma: {
    invoice: {
      findMany: h.invoiceFindMany,
      create: h.invoiceCreate,
      update: h.invoiceUpdate,
    },
  },
  TENANT_ID: "tenant-test",
}));
vi.mock("@/lib/audit", () => ({ logAudit: h.logAudit }));
vi.mock("./client-payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./client-payments")>()),
  createInvoicePaymentLink: h.createInvoicePaymentLink,
}));
vi.mock("@/lib/email/invoices", () => ({
  sendInvoicePaymentEmail: h.sendInvoicePaymentEmail,
}));

import { advanceChargeDate, rebillDueInvoices } from "./invoice-rebilling";

const d = (iso: string) => new Date(iso);

describe("advanceChargeDate", () => {
  it("advances weekly and bi-weekly", () => {
    expect(advanceChargeDate(d("2026-01-01T00:00:00Z"), "WEEKLY")).toEqual(d("2026-01-08T00:00:00Z"));
    expect(advanceChargeDate(d("2026-01-01T00:00:00Z"), "BIWEEKLY")).toEqual(d("2026-01-15T00:00:00Z"));
  });

  it("advances monthly", () => {
    expect(advanceChargeDate(d("2026-01-15T00:00:00Z"), "MONTHLY")).toEqual(d("2026-02-15T00:00:00Z"));
    expect(advanceChargeDate(d("2026-12-15T00:00:00Z"), "MONTHLY")).toEqual(d("2027-01-15T00:00:00Z"));
  });

  it("clamps end-of-month charges instead of rolling over", () => {
    expect(advanceChargeDate(d("2026-01-31T00:00:00Z"), "MONTHLY")).toEqual(d("2026-02-28T00:00:00Z"));
    expect(advanceChargeDate(d("2024-01-31T00:00:00Z"), "MONTHLY")).toEqual(d("2024-02-29T00:00:00Z"));
    expect(advanceChargeDate(d("2024-02-29T00:00:00Z"), "ANNUAL")).toEqual(d("2025-02-28T00:00:00Z"));
  });

  it("advances quarterly and annually", () => {
    expect(advanceChargeDate(d("2026-03-10T00:00:00Z"), "QUARTERLY")).toEqual(d("2026-06-10T00:00:00Z"));
    expect(advanceChargeDate(d("2026-03-10T00:00:00Z"), "ANNUAL")).toEqual(d("2027-03-10T00:00:00Z"));
  });

  it("defaults unknown/empty intervals to monthly", () => {
    expect(advanceChargeDate(d("2026-05-05T00:00:00Z"), "")).toEqual(d("2026-06-05T00:00:00Z"));
    expect(advanceChargeDate(d("2026-05-05T00:00:00Z"), "LEGACY")).toEqual(d("2026-06-05T00:00:00Z"));
  });
});

function dueParent(overrides: Record<string, unknown> = {}) {
  return {
    id: "sched_parent_1",
    clientId: "client_1",
    merchantId: "merch_1",
    amount: new Prisma.Decimal("150.00"),
    chargeDate: d("2026-09-13T00:00:00Z"),
    status: "APPROVED",
    isRecurring: true,
    interval: "MONTHLY",
    retries: 1,
    stripePaymentId: "pi_old",
    gatewayId: null,
    payUrl: "https://buy.stripe.com/old",
    stripePaymentLinkId: "plink_old",
    paidAt: d("2026-08-13T00:00:00Z"),
    responseMsg: "Paid via payment link",
    createdAt: d("2026-06-01T00:00:00Z"),
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
  h.invoiceUpdate.mockResolvedValue({});
  h.invoiceCreate.mockResolvedValue({ id: "child_new_1", amount: new Prisma.Decimal("150.00") });
  h.createInvoicePaymentLink.mockResolvedValue({ ok: true, url: "https://buy.stripe.com/new", reused: false });
  h.sendInvoicePaymentEmail.mockResolvedValue({ ok: true });
});

describe("rebillDueInvoices", () => {
  const now = d("2026-10-13T06:00:00Z");

  it("returns zero work when nothing is due", async () => {
    h.invoiceFindMany.mockResolvedValue([]);
    const result = await rebillDueInvoices(now);
    expect(result).toEqual({ scanned: 0, created: 0, linked: 0, emailed: 0, errors: 0 });
    expect(h.invoiceCreate).not.toHaveBeenCalled();
    expect(h.invoiceFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isRecurring: true,
          status: "APPROVED",
          interval: { not: null },
          chargeDate: { lte: now },
        }),
      }),
    );
  });

  it("bills the due period and schedules the next one on the parent", async () => {
    h.invoiceFindMany.mockResolvedValue([dueParent()]);

    const result = await rebillDueInvoices(now);

    expect(result).toMatchObject({ scanned: 1, created: 1, linked: 1, emailed: 1, errors: 0 });
    expect(h.invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "client_1",
        merchantId: "merch_1",
        amount: new Prisma.Decimal("150.00"),
        chargeDate: d("2026-09-13T00:00:00Z"), // the period that came due
        status: "ATTEMPTED",
        isRecurring: false,
        retries: 0,
      }),
    });
    // parent advanced exactly ONE period (2026-09-13 → 2026-10-13), not past it
    expect(h.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: "sched_parent_1" },
      data: { chargeDate: d("2026-10-13T00:00:00Z") },
    });
    expect(h.createInvoicePaymentLink).toHaveBeenCalledWith("child_new_1");
    expect(h.sendInvoicePaymentEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "fatima@example.com",
        invoiceId: "child_new_1",
        amount: "150.00",
        payUrl: "https://buy.stripe.com/new",
      }),
    );
    expect(h.invoiceUpdate).toHaveBeenCalledWith({
      where: { id: "child_new_1" },
      data: { emailSentAt: expect.any(Date) },
    });
    expect(h.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "INVOICE_CREATE", entityId: "child_new_1" }),
    );
  });

  it("still bills when the payment link fails (offline/manual setups)", async () => {
    h.invoiceFindMany.mockResolvedValue([dueParent()]);
    h.createInvoicePaymentLink.mockResolvedValue({ ok: false, error: "no Stripe gateway" });

    const result = await rebillDueInvoices(now);

    expect(result).toMatchObject({ created: 1, linked: 0, emailed: 0, errors: 0 });
    expect(h.sendInvoicePaymentEmail).not.toHaveBeenCalled();
  });

  it("still counts the rebill when the email provider is not configured", async () => {
    h.invoiceFindMany.mockResolvedValue([dueParent({ client: { ...dueParent().client, email: null } })]);
    h.sendInvoicePaymentEmail.mockResolvedValue({ ok: false, error: "Email provider not configured." });

    const result = await rebillDueInvoices(now);

    expect(result).toMatchObject({ created: 1, linked: 1, emailed: 0, errors: 0 });
  });

  it("continues with other schedules when one rebill fails", async () => {
    h.invoiceFindMany.mockResolvedValue([
      dueParent({ id: "sched_bad" }),
      dueParent({ id: "sched_ok", clientId: "client_2" }),
    ]);
    h.invoiceCreate
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce({ id: "child_ok", amount: new Prisma.Decimal("150.00") });

    const result = await rebillDueInvoices(now);

    expect(result).toMatchObject({ scanned: 2, created: 1, errors: 1 });
    expect(h.createInvoicePaymentLink).toHaveBeenCalledWith("child_ok");
  });
});

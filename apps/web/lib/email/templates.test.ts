import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
}));

vi.mock("@/modules/shared", () => ({
  prisma: {
    tenant: { findUnique: h.tenantFindUnique },
  },
  TENANT_ID: "tenant-test",
}));

import {
  DEFAULT_INVOICE_TEMPLATE,
  EMAIL_TEMPLATES,
  TEMPLATE_KEYS,
  isDefaultInvoiceTemplate,
  loadEmailTemplate,
  loadInvoiceEmailTemplate,
  normalizeInvoiceTemplate,
  renderInvoiceEmail,
  renderTemplate,
} from "./templates";

const DATA = {
  clientName: "Jane Doe",
  invoiceId: "cmvabcdefghijklmno",
  amount: "97.00",
  payUrl: "https://buy.stripe.com/test_abc",
  payPageUrl: (id: string) => `http://localhost/pay/${id}`,
};

describe("normalizeInvoiceTemplate", () => {
  it("falls back to defaults for empty/partial input", () => {
    expect(normalizeInvoiceTemplate(null)).toEqual(DEFAULT_INVOICE_TEMPLATE);
    expect(normalizeInvoiceTemplate({})).toEqual(DEFAULT_INVOICE_TEMPLATE);
    expect(normalizeInvoiceTemplate({ subject: "  " })).toEqual(DEFAULT_INVOICE_TEMPLATE);
  });

  it("keeps custom values", () => {
    const t = normalizeInvoiceTemplate({ subject: "Pay {amount}", body: "<p>Hi {client_name}</p>" });
    expect(t).toEqual({ subject: "Pay {amount}", body: "<p>Hi {client_name}</p>" });
  });

  it("detects the default template", () => {
    expect(isDefaultInvoiceTemplate(null)).toBe(true);
    expect(isDefaultInvoiceTemplate(DEFAULT_INVOICE_TEMPLATE)).toBe(true);
    expect(isDefaultInvoiceTemplate({ subject: "Custom" })).toBe(false);
  });
});

describe("renderInvoiceEmail — default template", () => {
  it("renders the legacy invoice email with placeholders filled", () => {
    const { subject, html, text } = renderInvoiceEmail(DATA, DEFAULT_INVOICE_TEMPLATE);
    expect(subject).toBe("Invoice hijklmno — $97.00 due");
    expect(html).toContain("$97.00");
    expect(html).toContain('href="https://buy.stripe.com/test_abc"');
    expect(html).toContain("Hi Jane Doe,");
    expect(html).toContain("cmvabcdefghijklmno");
    expect(html).not.toContain("{");
    expect(text).toContain("Jane Doe");
    expect(text).toContain("https://buy.stripe.com/test_abc");
    expect(text).not.toContain("<");
  });

  it("uses the pay page fallback when no Stripe link exists", () => {
    const { html } = renderInvoiceEmail({ ...DATA, payUrl: null }, DEFAULT_INVOICE_TEMPLATE);
    expect(html).toContain("http://localhost/pay/cmvabcdefghijklmno");
  });

  it("handles a missing client name gracefully", () => {
    const { html } = renderInvoiceEmail({ ...DATA, clientName: "" }, DEFAULT_INVOICE_TEMPLATE);
    expect(html).toContain("Hi there,");
    expect(html).not.toContain("Hi ,");
  });

  it("HTML-escapes injected values", () => {
    const { html, subject } = renderInvoiceEmail(
      { ...DATA, clientName: '<script>alert("x")</script>' },
      DEFAULT_INVOICE_TEMPLATE,
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(subject).not.toContain("<script>");
  });
});

describe("renderInvoiceEmail — custom template", () => {
  it("replaces placeholders in subject and body, leaving unknown ones alone", () => {
    const template = {
      subject: "Hello {client_name}, pay {amount}",
      body: '<p>Link: <a href="{pay_link}">Pay</a> — {unknown_tag} — ref {invoice_ref}</p>',
    };
    const { subject, html } = renderInvoiceEmail(DATA, template);
    expect(subject).toBe("Hello Jane Doe, pay 97.00");
    expect(html).toContain('<a href="https://buy.stripe.com/test_abc">Pay</a>');
    expect(html).toContain("{unknown_tag}");
    expect(html).toContain("jklmno");
  });

  it("replaces every occurrence", () => {
    const { html } = renderInvoiceEmail(DATA, {
      subject: "s",
      body: "{amount} + {amount} = {amount}",
    });
    expect(html).toBe("97.00 + 97.00 = 97.00");
  });
});

describe("loadInvoiceEmailTemplate", () => {
  it("returns the stored template", async () => {
    h.tenantFindUnique.mockResolvedValue({
      theme: { emailTemplates: { invoicePayment: { subject: "Custom {amount}", body: "<p>x</p>" } } },
    });
    const t = await loadInvoiceEmailTemplate();
    expect(t).toEqual({ subject: "Custom {amount}", body: "<p>x</p>" });
  });

  it("returns defaults when unset or the DB fails", async () => {
    h.tenantFindUnique.mockResolvedValue({ theme: null });
    expect(await loadInvoiceEmailTemplate()).toEqual(DEFAULT_INVOICE_TEMPLATE);
    h.tenantFindUnique.mockRejectedValue(new Error("db down"));
    expect(await loadInvoiceEmailTemplate()).toEqual(DEFAULT_INVOICE_TEMPLATE);
  });
});

describe("template registry", () => {
  it("covers every transactional email with non-empty defaults + sample data", () => {
    expect(TEMPLATE_KEYS).toEqual([
      "invoicePayment",
      "orderConfirmation",
      "orderPaid",
      "orderStatus",
      "orderRefund",
      "paymentFailed",
      "claimVerify",
      "claimAdmin",
    ]);
    for (const key of TEMPLATE_KEYS) {
      const meta = EMAIL_TEMPLATES[key];
      expect(meta.label, key).toBeTruthy();
      expect(meta.defaultTemplate.subject, key).toBeTruthy();
      expect(meta.defaultTemplate.body, key).toBeTruthy();
      for (const ph of meta.placeholders) {
        expect(meta.sample[ph], `${key} sample ${ph}`).toBeTruthy();
      }
    }
  });

  it("renders order emails from the defaults with sample data", () => {
    const meta = EMAIL_TEMPLATES.orderConfirmation;
    const { subject, html } = renderTemplate(meta.defaultTemplate, meta.sample);
    expect(subject).toBe("Order placed — order ORD-1001");
    expect(html).toContain("ORD-1001");
    expect(html).toContain("http://localhost:3000/orders?order=ORD-1001");
    expect(html).not.toContain("{");
  });

  it("renders the dunning email with retry link and grace days", () => {
    const meta = EMAIL_TEMPLATES.paymentFailed;
    const { subject, html, text } = renderTemplate(meta.defaultTemplate, meta.sample);
    expect(subject).toBe("Payment failed — listing acme-plumbing");
    expect(html).toContain("acme-plumbing");
    expect(html).toContain("http://localhost:3000/checkout?listing=acme-plumbing");
    expect(text).toContain("http://localhost:3000/checkout?listing=acme-plumbing");
  });

  it("renders claim emails from the defaults", () => {
    const verify = EMAIL_TEMPLATES.claimVerify;
    const v = renderTemplate(verify.defaultTemplate, verify.sample);
    expect(v.subject).toBe("Verify ownership of acme-plumbing on Canopy Directory");
    expect(v.html).toContain("Verify Ownership");
    expect(v.html).toContain("http://localhost:3000/api/claim/verify?token=sample&amp;slug=acme-plumbing");

    const admin = EMAIL_TEMPLATES.claimAdmin;
    const a = renderTemplate(admin.defaultTemplate, admin.sample);
    expect(a.subject).toBe("New Claim Request: acme-plumbing");
    expect(a.html).toContain("jane@example.com");
    expect(a.html).toContain("http://localhost:3000/admin/listings/list_123");
  });

  it("loads any template key from the theme, falling back to defaults", async () => {
    h.tenantFindUnique.mockResolvedValue({
      theme: { emailTemplates: { orderPaid: { subject: "Thx {order_number}", body: "<p>yay</p>" } } },
    });
    expect(await loadEmailTemplate("orderPaid")).toEqual({ subject: "Thx {order_number}", body: "<p>yay</p>" });
    expect(await loadEmailTemplate("orderStatus")).toEqual(EMAIL_TEMPLATES.orderStatus.defaultTemplate);
  });
});

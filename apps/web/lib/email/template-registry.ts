/**
 * Email templates — Gravity-Forms-style editable content with {placeholders}.
 *
 * One registry entry per transactional email. Stored per-tenant in
 * Tenant.theme.emailTemplates (JSON). When no custom template is saved the
 * DEFAULT renders exactly the legacy built-in email, so nothing changes until
 * an admin edits it.
 *
 * Placeholders are replaced at send time and HTML-escaped. Any placeholder
 * whose value is a URL is also appended to the auto-derived plain-text
 * version so text-only clients keep the link.
 *
 * This module is pure data + render helpers (client-safe). Loaders that read
 * the tenant theme live in ./templates.
 */
export type EmailTemplate = { subject: string; body: string };
/** Back-compat alias (the first templated email was the client invoice). */
export type InvoiceEmailTemplate = EmailTemplate;

export type TemplateKey =
  | "invoicePayment"
  | "orderConfirmation"
  | "orderPaid"
  | "orderStatus"
  | "orderRefund"
  | "paymentFailed"
  | "claimVerify"
  | "claimAdmin";

export type TemplateMeta = {
  label: string;
  description: string;
  placeholders: readonly string[];
  defaultTemplate: EmailTemplate;
  /** Sample placeholder values for the live preview. */
  sample: Record<string, string>;
};

export const INVOICE_PLACEHOLDERS = [
  "{client_name}",
  "{amount}",
  "{pay_link}",
  "{invoice_id}",
  "{invoice_ref}",
] as const;

const ORDER_PLACEHOLDERS = [
  "{order_number}",
  "{status_label}",
  "{total}",
  "{payment_method}",
  "{order_link}",
] as const;

export const EMAIL_TEMPLATES: Record<TemplateKey, TemplateMeta> = {
  invoicePayment: {
    label: "Client Invoice Email",
    description:
      "Sent when you click Email on an invoice (and automatically for recurring rebills).",
    placeholders: INVOICE_PLACEHOLDERS,
    defaultTemplate: {
      subject: "Invoice {invoice_ref} — ${amount} due",
      body: `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
      <h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">Your invoice is ready</h1>
      <p style="font-size:14px;color:#3f3f46;">
        Hi {client_name}, an invoice for <strong>${"$"}{amount}</strong> is awaiting payment.
      </p>
      <p style="font-size:14px;margin-top:16px;">
        <a href="{pay_link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;display:inline-block;">Pay invoice</a>
      </p>
      <p style="font-size:12px;color:#71717a;margin-top:16px;">
        Secure payment via our payment provider. Reference: {invoice_id}.
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:24px;">This is a transactional message from Canopy.</p>
    </div></div></html>`,
    },
    sample: {
      "{client_name}": "Sample Client",
      "{amount}": "97.00",
      "{pay_link}": "https://buy.stripe.com/test_sample",
      "{invoice_id}": "cmv0000000000000sample01",
      "{invoice_ref}": "sample01",
    },
  },
  orderConfirmation: {
    label: "Product Order Confirmation (awaiting payment)",
    description: "Sent when an order is first placed and is awaiting payment.",
    placeholders: ORDER_PLACEHOLDERS,
    defaultTemplate: {
      subject: "Order placed — order {order_number}",
      body: `<h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">Thank you for your order!</h1>
<p style="font-size:14px;color:#3f3f46;">Your order <strong>{order_number}</strong> has been received and is awaiting payment.</p>
<p style="font-size:14px;color:#3f3f46;">Please complete payment <a href="{order_link}">here</a> to confirm your order.</p>`,
    },
    sample: {
      "{order_number}": "ORD-1001",
      "{status_label}": "Awaiting payment",
      "{total}": "129.00",
      "{payment_method}": "Card",
      "{order_link}": "http://localhost:3000/orders?order=ORD-1001",
    },
  },
  orderPaid: {
    label: "Product Order Paid / Thank You",
    description: "Sent when payment for an order is received.",
    placeholders: ORDER_PLACEHOLDERS,
    defaultTemplate: {
      subject: "Payment received — order {order_number}",
      body: `<h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">Thanks for your order!</h1>
<p style="font-size:14px;color:#3f3f46;">We've received your payment and your order is being prepared.</p>`,
    },
    sample: {
      "{order_number}": "ORD-1001",
      "{status_label}": "Processing",
      "{total}": "129.00",
      "{payment_method}": "Card",
      "{order_link}": "http://localhost:3000/orders?order=ORD-1001",
    },
  },
  orderStatus: {
    label: "Product Order Status Update",
    description: "Generic status-change email from the admin or webhooks.",
    placeholders: ORDER_PLACEHOLDERS,
    defaultTemplate: {
      subject: "Order {order_number} — {status_label}",
      body: `<h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">Order update: {status_label}</h1>
<p style="font-size:14px;color:#3f3f46;">The status of your order <strong>{order_number}</strong> is now <strong>{status_label}</strong>.</p>`,
    },
    sample: {
      "{order_number}": "ORD-1001",
      "{status_label}": "Completed",
      "{total}": "129.00",
      "{payment_method}": "Card",
      "{order_link}": "http://localhost:3000/orders?order=ORD-1001",
    },
  },
  orderRefund: {
    label: "Product Order Refund",
    description: "Sent when a full or partial refund is issued.",
    placeholders: [...ORDER_PLACEHOLDERS, "{refund_amount}"] as const,
    defaultTemplate: {
      subject: "Refund processed — order {order_number}",
      body: `<h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">Your refund has been processed</h1>
<p style="font-size:14px;color:#3f3f46;">A refund of <strong>${"$"}{refund_amount}</strong> for order <strong>{order_number}</strong> has been issued to your original payment method.</p>`,
    },
    sample: {
      "{order_number}": "ORD-1001",
      "{status_label}": "Refunded",
      "{total}": "129.00",
      "{payment_method}": "Card",
      "{order_link}": "http://localhost:3000/orders?order=ORD-1001",
      "{refund_amount}": "29.00",
    },
  },
  paymentFailed: {
    label: "Listing Payment Failed (dunning)",
    description: "Sent when a listing subscription payment fails — retry + grace warning.",
    placeholders: ["{listing_id}", "{retry_link}", "{grace_days}"] as const,
    defaultTemplate: {
      subject: "Payment failed — listing {listing_id}",
      body: `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
      <h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">Payment Failed — Action Required</h1>
      <p style="font-size:14px;color:#3f3f46;">
        Unfortunately, the payment for your listing <strong>{listing_id}</strong> failed.
      </p>
      <p style="font-size:14px;color:#3f3f46;">
        Your listing is currently suspended and will be <strong>expired</strong> <span style="font-variant-numeric:lining-nums;">{grace_days}</span> day(s) from now if payment is not recovered.
      </p>
      <p style="font-size:14px;color:#3f3f46;">
        <a href="{retry_link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;display:inline-block;">Retry Payment</a>
      </p>
      <p style="color:#71717a;font-size:12px;margin-top:24px;">This is a transactional message from Canopy.</p>
    </div></div></html>`,
    },
    sample: {
      "{listing_id}": "acme-plumbing",
      "{retry_link}": "http://localhost:3000/checkout?listing=acme-plumbing",
      "{grace_days}": "7",
    },
  },
  claimVerify: {
    label: "Listing Claim Verification (to claimant)",
    description: "Business-ownership verification email sent from the public claim form.",
    placeholders: ["{claimant_name}", "{business_slug}", "{verify_link}"] as const,
    defaultTemplate: {
      subject: "Verify ownership of {business_slug} on Canopy Directory",
      body: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:system-ui,sans-serif;background:#f4f4f5;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:32px;">
      <h1 style="font-size:24px;margin:0 0 16px;color:#18181b;">Verify Your Business Ownership</h1>
      <p style="font-size:16px;color:#3f3f46;">Hi {claimant_name},</p>
      <p style="font-size:16px;color:#3f3f46;">
        Someone (hopefully you!) requested to claim the business <strong>{business_slug}</strong> on Canopy Directory.
      </p>
      <p style="font-size:16px;color:#3f3f46;">
        Click the button below to verify your ownership:
      </p>
      <p style="text-align:center;margin:24px 0;">
        <a href="{verify_link}" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:500;display:inline-block;">
          Verify Ownership
        </a>
      </p>
      <p style="font-size:14px;color:#71717a;">
        Or copy this link: <br>
        <a href="{verify_link}" style="color:#2563eb;word-break:break-all;">{verify_link}</a>
      </p>
      <p style="font-size:14px;color:#71717a;margin-top:16px;">
        This link expires in 24 hours. If you didn't request this, please ignore this email.
      </p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
      <p style="font-size:12px;color:#71717a;">Canopy Directory — Business Verification</p>
    </div>
  </div>
</body>
</html>`,
    },
    sample: {
      "{claimant_name}": "Jane Owner",
      "{business_slug}": "acme-plumbing",
      "{verify_link}": "http://localhost:3000/api/claim/verify?token=sample&slug=acme-plumbing",
    },
  },
  claimAdmin: {
    label: "Listing Claim Request (admin notification)",
    description: "Notifies the admin email whenever someone submits a claim request.",
    placeholders: [
      "{business_slug}",
      "{claimant_name}",
      "{claimant_email}",
      "{claimant_role}",
      "{email_matches}",
      "{admin_link}",
    ] as const,
    defaultTemplate: {
      subject: "New Claim Request: {business_slug}",
      body: `<h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">New claim request</h1>
<p style="font-size:14px;color:#3f3f46;">New claim request for: <strong>{business_slug}</strong></p>
<p style="font-size:14px;color:#3f3f46;">Claimant: {claimant_name} ({claimant_email})</p>
<p style="font-size:14px;color:#3f3f46;">Role: {claimant_role}</p>
<p style="font-size:14px;color:#3f3f46;">Email matches listing: {email_matches}</p>
<p style="font-size:14px;"><a href="{admin_link}">View in Admin</a></p>`,
    },
    sample: {
      "{business_slug}": "acme-plumbing",
      "{claimant_name}": "Jane Owner",
      "{claimant_email}": "jane@example.com",
      "{claimant_role}": "Owner",
      "{email_matches}": "Yes",
      "{admin_link}": "http://localhost:3000/admin/listings/list_123",
    },
  },
};

export const TEMPLATE_KEYS = Object.keys(EMAIL_TEMPLATES) as TemplateKey[];

export function isTemplateKey(value: string): value is TemplateKey {
  return value in EMAIL_TEMPLATES;
}

export const DEFAULT_INVOICE_TEMPLATE = EMAIL_TEMPLATES.invoicePayment.defaultTemplate;

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Merge unknown/partial stored JSON over the given defaults. */
export function normalizeTemplate(raw: unknown, defaults: EmailTemplate): EmailTemplate {
  const t = (raw ?? {}) as Partial<EmailTemplate>;
  const subject = typeof t.subject === "string" ? t.subject.trim() : "";
  const body = typeof t.body === "string" ? t.body.trim() : "";
  return { subject: subject || defaults.subject, body: body || defaults.body };
}

export function isDefaultTemplate(raw: unknown, defaults: EmailTemplate): boolean {
  const t = normalizeTemplate(raw, defaults);
  return t.subject === defaults.subject && t.body === defaults.body;
}

export function normalizeInvoiceTemplate(raw: unknown): EmailTemplate {
  return normalizeTemplate(raw, DEFAULT_INVOICE_TEMPLATE);
}

export function isDefaultInvoiceTemplate(raw: unknown): boolean {
  return isDefaultTemplate(raw, DEFAULT_INVOICE_TEMPLATE);
}

/** Replace placeholders; values are HTML-escaped. */
export function renderPlaceholders(template: string, values: Record<string, string>): string {
  const escaped = Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, esc(v ?? "")]),
  );
  return Object.entries(escaped).reduce((acc, [k, v]) => acc.split(k).join(v), template);
}

export type RenderedEmail = { subject: string; html: string; text: string };

/** Render a template against raw (unescaped) values; derives the text part. */
export function renderTemplate(
  template: EmailTemplate,
  values: Record<string, string>,
): RenderedEmail {
  const subject = renderPlaceholders(template.subject, values);
  const html = renderPlaceholders(template.body, values);
  let text = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Plain-text clients need URLs even though they only lived in hrefs.
  for (const v of Object.values(values)) {
    if (v && /^https?:\/\//.test(v) && !text.includes(v)) text += `\n${v}`;
  }
  return { subject, html, text };
}

/* ------------------------------------------------------- invoice convenience */

export type InvoiceEmailData = {
  clientName: string;
  invoiceId: string;
  amount: string; // "97.00"
  payUrl: string | null;
  /** Fallback pay page URL when no Stripe link exists yet. */
  payPageUrl: (invoiceId: string) => string;
};

export function invoiceEmailValues(data: InvoiceEmailData): Record<string, string> {
  return {
    "{client_name}": data.clientName || "there",
    "{amount}": data.amount,
    "{pay_link}": data.payUrl ?? data.payPageUrl(data.invoiceId),
    "{invoice_id}": data.invoiceId,
    "{invoice_ref}": data.invoiceId.slice(-8),
  };
}

export function renderInvoiceEmail(data: InvoiceEmailData, template: EmailTemplate): RenderedEmail {
  return renderTemplate(template, invoiceEmailValues(data));
}

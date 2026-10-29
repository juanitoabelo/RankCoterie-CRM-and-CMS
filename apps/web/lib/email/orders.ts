/**
 * Order lifecycle emails (confirmation, paid, status change, refund) + listing
 * dunning. Content comes from the editable templates (Admin → Client Email
 * Settings) with the built-in defaults as fallback. The order item/total table
 * stays dynamic (generated per order). All sends are best-effort: failures are
 * logged, never thrown, so they can't block checkout or admin actions.
 */
import type Stripe from "stripe";
import { sendEmail } from "./send";
import {
  loadEmailTemplate,
  renderTemplate,
  type TemplateKey,
} from "./templates";

export type OrderEmailData = {
  orderNumber: string;
  status: string;
  paymentMethodTitle: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  email: string | null;
  items: { name: string; quantity: number; lineTotal: number }[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Awaiting payment",
  PROCESSING: "Processing",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  FAILED: "Failed",
};

/** Map a Prisma order row (with items) to the email payload. */
export function toOrderEmailData(order: {
  orderNumber: string;
  status: string;
  paymentMethodTitle: string | null;
  billingEmail: string | null;
  guestEmail: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  items: { name: string; quantity: number; lineTotal: number }[];
}): OrderEmailData {
  return { ...order, email: order.billingEmail ?? order.guestEmail };
}

function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function orderUrl(order: OrderEmailData): string {
  return `${siteUrl()}/orders?order=${encodeURIComponent(order.orderNumber)}`;
}

/** Placeholder values for the order template family. */
function orderValues(order: OrderEmailData, extra: Record<string, string> = {}): Record<string, string> {
  return {
    "{order_number}": order.orderNumber,
    "{status_label}": STATUS_LABELS[order.status] ?? order.status,
    "{total}": order.total.toFixed(2),
    "{payment_method}": order.paymentMethodTitle ?? "—",
    "{order_link}": orderUrl(order),
    ...extra,
  };
}

function layout(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
      ${bodyHtml}
      <p style="color:#71717a;font-size:12px;margin-top:24px;">This is a transactional message from Rank Coterie.</p>
    </div>
  </div></body></html>`;
}

function orderRows(order: OrderEmailData): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return order.items
    .map(
      (item) =>
        `<tr><td style="padding:6px 0;color:#3f3f46;">${esc(item.name)} × ${item.quantity}</td><td style="padding:6px 0;text-align:right;color:#18181b;">$${item.lineTotal.toFixed(2)}</td></tr>`,
    )
    .join("");
}

function totalsRows(order: OrderEmailData): string {
  const rows: string[] = [];
  rows.push(
    `<tr><td style="color:#3f3f46;">Subtotal</td><td style="text-align:right;">$${order.subtotal.toFixed(2)}</td></tr>`,
  );
  if (order.discountTotal > 0) {
    rows.push(
      `<tr><td style="color:#3f3f46;">Discount</td><td style="text-align:right;">−$${order.discountTotal.toFixed(2)}</td></tr>`,
    );
  }
  if (order.shippingTotal > 0) {
    rows.push(
      `<tr><td style="color:#3f3f46;">Shipping</td><td style="text-align:right;">$${order.shippingTotal.toFixed(2)}</td></tr>`,
    );
  }
  if (order.taxTotal > 0) {
    rows.push(
      `<tr><td style="color:#3f3f46;">Tax</td><td style="text-align:right;">$${order.taxTotal.toFixed(2)}</td></tr>`,
    );
  }
  rows.push(
    `<tr><td style="font-weight:600;padding-top:8px;border-top:1px solid #e4e4e7;">Total</td><td style="text-align:right;font-weight:600;padding-top:8px;border-top:1px solid #e4e4e7;">$${order.total.toFixed(2)}</td></tr>`,
  );
  return rows.join("");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Order email: templated message + dynamic items/totals table + status footer. */
async function sendOrderEmail(
  order: OrderEmailData,
  key: TemplateKey,
  extraValues: Record<string, string> = {},
): Promise<void> {
  if (!order.email) return;
  const values = orderValues(order, extraValues);
  const { subject, html: bodyHtml, text: bodyText } = renderTemplate(
    await loadEmailTemplate(key),
    values,
  );
  const html = layout(`${bodyHtml}
    <table style="width:100%;margin-top:16px;font-size:14px;border-collapse:collapse;">
      ${orderRows(order)}
      ${totalsRows(order)}
    </table>
    <p style="font-size:14px;color:#3f3f46;margin-top:16px;">
      Order <strong>${esc(order.orderNumber)}</strong> — ${esc(STATUS_LABELS[order.status] ?? order.status)}
      · paid via ${esc(order.paymentMethodTitle ?? "—")} ·
      <a href="${esc(orderUrl(order))}" style="color:#2563eb;">view order status</a>
    </p>`);
  const text = `${bodyText}\nOrder ${order.orderNumber} — ${STATUS_LABELS[order.status] ?? order.status}\nTotal $${order.total.toFixed(2)}\n${orderUrl(order)}`;
  const result = await sendEmail({ to: order.email, subject, html, text });
  if (!result.ok) console.warn(`[email] ${subject} → ${order.email} failed: ${result.error}`);
}

/** Sent when order is first created (PENDING) — confirmation with payment link. */
export async function sendOrderConfirmationEmail(order: OrderEmailData): Promise<void> {
  try {
    await sendOrderEmail(order, "orderConfirmation");
  } catch (e) {
    console.warn("[email] order confirmation email failed:", e);
  }
}

/** Payment received / order confirmation. */
export async function sendOrderPaidEmail(order: OrderEmailData): Promise<void> {
  try {
    await sendOrderEmail(order, "orderPaid");
  } catch (e) {
    console.warn("[email] order paid email failed:", e);
  }
}

/** Generic status-change email from the admin or webhooks. */
export async function sendOrderStatusEmail(order: OrderEmailData, status: string): Promise<void> {
  try {
    await sendOrderEmail(order, "orderStatus", {
      "{status_label}": STATUS_LABELS[status] ?? status,
    });
  } catch (e) {
    console.warn("[email] order status email failed:", e);
  }
}

/** Refund confirmation (pass `amount` for a partial refund). */
export async function sendOrderRefundEmail(order: OrderEmailData, amount?: number): Promise<void> {
  const refundAmount = (amount ?? order.total).toFixed(2);
  try {
    await sendOrderEmail(order, "orderRefund", { "{refund_amount}": refundAmount });
  } catch (e) {
    console.warn("[email] refund email failed:", e);
  }
}

/** Sent when a customer's listing payment fails — retry reminder with grace warning. */
export async function sendPaymentFailedEmail(
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
  listingId: string,
): Promise<void> {
  // Use Stripe's customer billing email if available, otherwise skip
  const email = invoice.customer_email ?? null;
  if (!email) return;

  const DUNNING_GRACE_DAYS = 7;
  const graceDays = Math.ceil(DUNNING_GRACE_DAYS / 7);
  const values = {
    "{listing_id}": listingId,
    "{retry_link}": `${siteUrl()}/checkout?listing=${listingId}`,
    "{grace_days}": String(graceDays),
  };
  const { subject, html, text } = renderTemplate(await loadEmailTemplate("paymentFailed"), values);
  const result = await sendEmail({ to: email, subject, html, text });
  if (!result.ok) console.warn(`[email] payment failed email → ${email} failed: ${result.error}`);
}

/**
 * Order lifecycle emails (confirmation, status change, refund).
 * All sends are best-effort: failures are logged, never thrown, so they can't
 * block checkout or admin actions.
 */
import { sendEmail } from "./send";

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

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:28px;">
      <h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">${esc(title)}</h1>
      ${bodyHtml}
      <p style="color:#71717a;font-size:12px;margin-top:24px;">This is a transactional message from Canopy.</p>
    </div>
  </div></body></html>`;
}

function orderRows(order: OrderEmailData): string {
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

async function send(order: OrderEmailData, subject: string, title: string, body: string): Promise<void> {
  if (!order.email) return;
  const html = layout(title, `${body}
    <table style="width:100%;margin-top:16px;font-size:14px;border-collapse:collapse;">
      ${orderRows(order)}
      ${totalsRows(order)}
    </table>
    <p style="font-size:14px;color:#3f3f46;margin-top:16px;">
      Order <strong>${esc(order.orderNumber)}</strong> — ${esc(STATUS_LABELS[order.status] ?? order.status)}
      · paid via ${esc(order.paymentMethodTitle ?? "—")} ·
      <a href="${siteUrl()}/orders?order=${encodeURIComponent(order.orderNumber)}" style="color:#2563eb;">view order status</a>
    </p>`);
  const text = `${title}\nOrder ${order.orderNumber} — ${STATUS_LABELS[order.status] ?? order.status}\nTotal $${order.total.toFixed(2)}\n${siteUrl()}/orders?order=${encodeURIComponent(order.orderNumber)}`;
  const result = await sendEmail({ to: order.email, subject, html, text });
  if (!result.ok) console.warn(`[email] ${subject} → ${order.email} failed: ${result.error}`);
}

/** Payment received / order confirmation. */
export async function sendOrderPaidEmail(order: OrderEmailData): Promise<void> {
  try {
    await send(
      order,
      `Payment received — order ${order.orderNumber}`,
      "Thanks for your order!",
      `<p style="font-size:14px;color:#3f3f46;">We've received your payment and your order is being prepared.</p>`,
    );
  } catch (e) {
    console.warn("[email] order paid email failed:", e);
  }
}

/** Generic status-change email from the admin or webhooks. */
export async function sendOrderStatusEmail(order: OrderEmailData, status: string): Promise<void> {
  try {
    const label = STATUS_LABELS[status] ?? status;
    await send(
      order,
      `Order ${order.orderNumber} — ${label}`,
      `Order update: ${label}`,
      `<p style="font-size:14px;color:#3f3f46;">The status of your order <strong>${esc(order.orderNumber)}</strong> is now <strong>${esc(label)}</strong>.</p>`,
    );
  } catch (e) {
    console.warn("[email] order status email failed:", e);
  }
}

/** Refund confirmation. */
export async function sendOrderRefundEmail(order: OrderEmailData): Promise<void> {
  try {
    await send(
      order,
      `Refund processed — order ${order.orderNumber}`,
      "Your refund has been processed",
      `<p style="font-size:14px;color:#3f3f46;">A full refund of <strong>$${order.total.toFixed(2)}</strong> for order <strong>${esc(order.orderNumber)}</strong> has been issued to your original payment method.</p>`,
    );
  } catch (e) {
    console.warn("[email] refund email failed:", e);
  }
}

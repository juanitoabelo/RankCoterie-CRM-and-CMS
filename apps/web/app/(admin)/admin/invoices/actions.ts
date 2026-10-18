"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { readStripeConfig } from "@/lib/billing/checkout";
import { createInvoicePaymentLink, deactivateInvoicePaymentLink } from "@/lib/billing/client-payments";
import { activateListingFromInvoice } from "@/lib/billing/listing-activation";
import { sendInvoicePaymentEmail } from "@/lib/email/invoices";

export type ActionResult = { ok: boolean; error?: string; message?: string; url?: string };

const INVOICE_STATUSES = ["ATTEMPTED", "APPROVED", "DECLINED", "ERROR", "REFUNDED", "CHARGEDBACK"];

export async function overrideInvoiceStatus(invoiceId: string, status: string): Promise<ActionResult> {
  await requireSection("invoices");
  if (!INVOICE_STATUSES.includes(status)) {
    return { ok: false, error: `Unknown invoice status "${status}".` };
  }
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, error: "Invoice not found." };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      ...(status === "APPROVED" && !invoice.paidAt ? { paidAt: new Date() } : {}),
    },
  });
  if (status === "APPROVED") {
    // Paid invoices must not keep a live reusable payment link.
    await deactivateInvoicePaymentLink(invoice);
    // Paid company-listing invoices take their landing page LIVE.
    await activateListingFromInvoice(invoice, "admin-override").catch(() => false);
  }
  await logAudit({
    action: "INVOICE_STATUS_OVERRIDE",
    entity: "Invoice",
    entityId: invoiceId,
    reason: `Invoice ${invoiceId} status ${invoice.status} → ${status}`,
    meta: { from: invoice.status, to: status, clientId: invoice.clientId },
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { ok: true, message: `Invoice marked ${status}.` };
}

/**
 * Which Stripe account took (or should take) this invoice's money:
 * the gateway recorded on the invoice first, else the designated
 * CLIENT_BILLING gateway, else any Stripe gateway (legacy behaviour).
 */
async function invoiceStripeGateway(invoice: { gatewayId?: string | null }) {
  if (invoice.gatewayId) {
    const gw = await prisma.paymentGateway.findFirst({
      where: { id: invoice.gatewayId, tenantId: TENANT_ID },
    });
    if (gw) return gw;
  }
  const clientBilling = await prisma.paymentGateway.findFirst({
    where: { tenantId: TENANT_ID, purpose: "CLIENT_BILLING", type: "STRIPE", isEnabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  if (clientBilling) return clientBilling;
  return prisma.paymentGateway.findFirst({ where: { tenantId: TENANT_ID, type: "STRIPE" } });
}

async function stripeRefundInvoice(
  invoice: {
    id: string;
    amount: Prisma.Decimal;
    stripePaymentId: string | null;
    status: string;
    gatewayId?: string | null;
  },
): Promise<{ ok: true; refundId?: string; manual: boolean } | { ok: false; error: string }> {
  if (invoice.status === "REFUNDED") {
    return { ok: false, error: "Invoice is already refunded." };
  }
  if (invoice.status === "CHARGEDBACK") {
    return { ok: false, error: "Invoice was charged back — no refund needed." };
  }
  if (!invoice.stripePaymentId) {
    // No gateway record — admin may still mark the refund (offline/manual charge).
    return { ok: true, manual: true };
  }
  const gateway = await invoiceStripeGateway(invoice);
  const cfg = readStripeConfig(gateway?.config);
  if (!cfg) {
    return { ok: false, error: "Stripe is not configured (no gateway secret key)." };
  }
  try {
    const stripe = new Stripe(cfg.secretKey);
    const refund = await stripe.refunds.create({
      payment_intent: invoice.stripePaymentId,
      amount: Math.round(Number(invoice.amount) * 100),
    });
    return { ok: true, refundId: refund.id, manual: false };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Stripe refund failed." };
  }
}

export async function refundInvoice(invoiceId: string): Promise<ActionResult> {
  await requireSection("invoices");
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, error: "Invoice not found." };

  const result = await stripeRefundInvoice(invoice);
  if (!result.ok) return { ok: false, error: result.error };

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "REFUNDED",
      responseMsg: result.manual
        ? "Refunded (manual — no gateway charge on record)"
        : `Refunded via Stripe (${result.refundId})`,
    },
  });
  await logAudit({
    action: "INVOICE_REFUND",
    entity: "Invoice",
    entityId: invoiceId,
    reason: `Invoice ${invoiceId} refunded ($${invoice.amount.toFixed(2)})${result.manual ? " manually" : ` via Stripe ${result.refundId}`}`,
    meta: { clientId: invoice.clientId, refundId: result.refundId ?? null },
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { ok: true, message: result.manual ? "Invoice marked refunded (manual)." : "Refunded via Stripe." };
}

export async function voidInvoice(invoiceId: string): Promise<ActionResult> {
  await requireSection("invoices");
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "REFUNDED" || invoice.status === "CHARGEDBACK") {
    return { ok: false, error: `Cannot void an invoice that is ${invoice.status}.` };
  }

  if (invoice.status === "APPROVED") {
    // Voiding a settled charge is a refund at the gateway.
    const result = await stripeRefundInvoice(invoice);
    if (!result.ok) return { ok: false, error: result.error };
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "REFUNDED",
        responseMsg: result.manual
          ? "Voided (manual — no gateway charge on record)"
          : `Voided via Stripe refund (${result.refundId})`,
      },
    });
    await logAudit({
      action: "INVOICE_VOID",
      entity: "Invoice",
      entityId: invoiceId,
      reason: `Approved invoice ${invoiceId} voided via refund`,
      meta: { clientId: invoice.clientId },
    });
    revalidatePath("/admin/invoices");
    revalidatePath(`/admin/clients/${invoice.clientId}`);
    return { ok: true, message: "Invoice voided (refunded)." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "DECLINED", responseMsg: "Voided by admin before settlement" },
  });
  await logAudit({
    action: "INVOICE_VOID",
    entity: "Invoice",
    entityId: invoiceId,
    reason: `Invoice ${invoiceId} (${invoice.status}) voided by admin`,
    meta: { clientId: invoice.clientId, from: invoice.status },
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { ok: true, message: "Invoice voided." };
}

export async function chargebackInvoice(invoiceId: string): Promise<ActionResult> {
  await requireSection("invoices");
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  if (invoice.status === "CHARGEDBACK") {
    return { ok: false, error: "Invoice is already charged back." };
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CHARGEDBACK", responseMsg: "Chargeback recorded by admin" },
  });
  await logAudit({
    action: "INVOICE_CHARGEBACK",
    entity: "Invoice",
    entityId: invoiceId,
    reason: `Invoice ${invoiceId} charged back ($${invoice.amount.toFixed(2)})`,
    meta: { clientId: invoice.clientId, from: invoice.status },
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return { ok: true, message: "Invoice marked charged back." };
}

export async function createInvoice(input: {
  clientId: string;
  amount: string;
  chargeDate?: string;
  chargeNum?: string;
  isRecurring?: boolean;
  interval?: string;
  merchantId?: string;
  listingId?: string;
}): Promise<ActionResult> {
  await requireSection("invoices");
  const client = await prisma.client.findUnique({ where: { id: input.clientId } });
  if (!client) return { ok: false, error: "Client not found." };

  const merchantId = input.merchantId?.trim() || null;
  if (merchantId) {
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) return { ok: false, error: "Merchant not found." };
  }

  // Company listing this invoice settles — paid ⇒ that landing page goes LIVE.
  const listingId = input.listingId?.trim() || null;
  if (listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, isLandingPage: true },
    });
    if (!listing?.isLandingPage) return { ok: false, error: "Company page not found." };
  }

  const amountStr = input.amount.trim();
  if (!amountStr || !/^\d+(\.\d{1,2})?$/.test(amountStr)) {
    return { ok: false, error: "Enter a valid amount (e.g. 97.00)." };
  }
  const amount = new Prisma.Decimal(amountStr);
  if (amount.lte(0)) return { ok: false, error: "Amount must be greater than zero." };

  const chargeDate = input.chargeDate ? new Date(input.chargeDate) : new Date();
  if (Number.isNaN(chargeDate.getTime())) {
    return { ok: false, error: "Enter a valid charge date." };
  }
  const chargeNum = parseInt(input.chargeNum ?? "1", 10) || 1;
  const isRecurring = input.isRecurring === true;

  const invoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      merchantId,
      amount,
      chargeDate,
      status: "ATTEMPTED",
      isRecurring,
      interval: isRecurring ? input.interval?.trim() || "MONTHLY" : null,
      retries: Math.max(0, chargeNum - 1),
      listingId,
      responseMsg: listingId
        ? `Company listing invoice (charge #${chargeNum})`
        : `Manual invoice (charge #${chargeNum})`,
    },
  });
  await logAudit({
    action: "INVOICE_CREATE",
    entity: "Invoice",
    entityId: invoice.id,
    reason: `Invoice $${amount.toFixed(2)} created for client ${client.id} (charge #${chargeNum})`,
    meta: { clientId: client.id, amount: amountStr, chargeNum, ...(listingId ? { listingId } : {}) },
  });

  // Best-effort: attach the Stripe pay link right away so the invoice is
  // shareable immediately. On failure the invoice still exists — the Pay
  // link button stays available once payment settings are fixed.
  const link = await createInvoicePaymentLink(invoice.id).catch(() => null);
  const linkNote =
    link?.ok
      ? ""
      : ` Payment link not created${link?.error ? `: ${link.error}` : ""} — fix payment settings, then use the Pay link button.`;

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${client.id}`);
  if (listingId) revalidatePath(`/admin/company-listings/${listingId}/edit`);
  return {
    ok: true,
    message: `Invoice created for ${client.firstName} ${client.lastName}.${linkNote}`,
    ...(link?.ok ? { url: link.url } : {}),
  };
}

// Form-action wrappers (Next 16: <form action> needs (FormData) => void | Promise<void>).
// Failures redirect back with ?error= so nothing fails silently.

function invoicesError(error: string): never {
  redirect(`/admin/invoices?error=${encodeURIComponent(error)}`);
}
function invoicesOk(message: string): never {
  redirect(`/admin/invoices?ok=${encodeURIComponent(message)}`);
}

export async function invoiceStatusForm(formData: FormData): Promise<void> {
  const result = await overrideInvoiceStatus(
    String(formData.get("invoiceId") ?? ""),
    String(formData.get("status") ?? ""),
  );
  if (!result.ok) invoicesError(result.error ?? "Could not update invoice status.");
  invoicesOk(result.message ?? "Invoice updated.");
}

export async function invoiceRefundForm(formData: FormData): Promise<void> {
  const result = await refundInvoice(String(formData.get("invoiceId") ?? ""));
  if (!result.ok) invoicesError(result.error ?? "Could not refund invoice.");
  invoicesOk(result.message ?? "Invoice refunded.");
}

export async function invoiceVoidForm(formData: FormData): Promise<void> {
  const result = await voidInvoice(String(formData.get("invoiceId") ?? ""));
  if (!result.ok) invoicesError(result.error ?? "Could not void invoice.");
  invoicesOk(result.message ?? "Invoice voided.");
}

export async function invoiceChargebackForm(formData: FormData): Promise<void> {
  const result = await chargebackInvoice(String(formData.get("invoiceId") ?? ""));
  if (!result.ok) invoicesError(result.error ?? "Could not record chargeback.");
  invoicesOk(result.message ?? "Chargeback recorded.");
}

export async function invoiceCreateForm(formData: FormData): Promise<void> {
  const recurring = formData.get("isRecurring") === "on" || formData.get("isRecurring") === "true";
  const result = await createInvoice({
    clientId: String(formData.get("clientId") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    chargeDate: String(formData.get("chargeDate") ?? ""),
    chargeNum: String(formData.get("chargeNum") ?? "1"),
    isRecurring: recurring,
    interval: String(formData.get("interval") ?? ""),
    merchantId: String(formData.get("merchantId") ?? ""),
    listingId: String(formData.get("listingId") ?? ""),
  });
  if (!result.ok) invoicesError(result.error ?? "Could not create invoice.");
  invoicesOk(result.message ?? "Invoice created.");
}

/** Create the hosted Stripe payment link for an invoice (CLIENT_BILLING gateway). */
export async function createPaymentLinkForInvoice(invoiceId: string): Promise<ActionResult & { url?: string }> {
  const actor = await requireSection("invoices");
  const result = await createInvoicePaymentLink(invoiceId);
  if (!result.ok) return { ok: false, error: result.error };
  if (!result.reused) {
    await logAudit({
      action: "INVOICE_PAYMENT_LINK",
      entity: "Invoice",
      entityId: invoiceId,
      reason: `Payment link created: ${result.url}`,
      meta: { url: result.url },
      actorId: actor.id,
    });
  }
  revalidatePath("/admin/invoices");
  return {
    ok: true,
    url: result.url,
    message: `${result.reused ? "Payment link ready" : "Payment link created"}: ${result.url}`,
  };
}

/** Email the invoice (with payment link, created on the fly if missing) to the client. */
export async function sendInvoiceEmailForInvoice(invoiceId: string): Promise<ActionResult> {
  const actor = await requireSection("invoices");
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true },
  });
  if (!invoice) return { ok: false, error: "Invoice not found." };
  const to = invoice.client.email?.trim();
  if (!to) return { ok: false, error: "Client has no email address on file." };

  let payUrl = invoice.payUrl;
  let linkNote: string | null = null;
  if (!payUrl && invoice.status !== "APPROVED") {
    const link = await createInvoicePaymentLink(invoiceId);
    if (link.ok) {
      payUrl = link.url;
    } else {
      // Still email the invoice (pay page explains how to settle offline) but
      // surface why the link is missing so config problems aren't hidden.
      linkNote = `no payment link (${link.error})`;
    }
  }

  const sent = await sendInvoicePaymentEmail({
    to,
    clientName: [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" "),
    invoiceId: invoice.id,
    amount: invoice.amount.toFixed(2),
    payUrl,
  });
  if (!sent.ok) {
    return { ok: false, error: `Could not send invoice email: ${sent.error ?? "unknown error"}` };
  }

  await prisma.invoice.update({ where: { id: invoiceId }, data: { emailSentAt: new Date() } });
  await logAudit({
    action: "INVOICE_EMAIL",
    entity: "Invoice",
    entityId: invoiceId,
    reason: `Invoice emailed to ${to}${linkNote ? ` (${linkNote})` : ""}`,
    meta: { to, payUrl, linkNote },
    actorId: actor.id,
  });
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/clients/${invoice.clientId}`);
  return {
    ok: true,
    message: `Invoice emailed to ${to}.${linkNote ? ` Note: ${linkNote}.` : ""}`,
  };
}

export async function invoiceLinkForm(formData: FormData): Promise<void> {
  const result = await createPaymentLinkForInvoice(String(formData.get("invoiceId") ?? ""));
  if (!result.ok) invoicesError(result.error ?? "Could not create payment link.");
  invoicesOk(result.message ?? "Payment link ready.");
}

export async function invoiceEmailForm(formData: FormData): Promise<void> {
  const result = await sendInvoiceEmailForInvoice(String(formData.get("invoiceId") ?? ""));
  if (!result.ok) invoicesError(result.error ?? "Could not send invoice email.");
  invoicesOk(result.message ?? "Invoice emailed.");
}

/**
 * Client invoice payment emails — invite/reminder with the hosted payment link.
 * Content comes from the editable template (Admin → Email Settings → Email
 * templates) with the built-in default as fallback. Best-effort: never throws
 * into the caller; returns the provider result so the admin action can report
 * "not configured" honestly.
 */
import { sendEmail } from "./send";
import { payPageUrl } from "@/lib/billing/client-payments";
import { loadInvoiceEmailTemplate, renderInvoiceEmail } from "./templates";

export type InvoiceEmailInput = {
  to: string;
  clientName: string;
  invoiceId: string;
  amount: string; // "97.00"
  payUrl: string | null;
};

export async function sendInvoicePaymentEmail(input: InvoiceEmailInput): Promise<{ ok: boolean; error?: string }> {
  const template = await loadInvoiceEmailTemplate();
  const { subject, html, text } = renderInvoiceEmail(
    {
      clientName: input.clientName,
      invoiceId: input.invoiceId,
      amount: input.amount,
      payUrl: input.payUrl,
      payPageUrl,
    },
    template,
  );
  return sendEmail({ to: input.to, subject, html, text });
}

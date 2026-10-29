/**
 * Rank Coterie — Inngest job: recurring client-invoice rebilling.
 *
 * Runs daily (INVOICE_REBILL_CRON env overrides) and on
 * billing/invoices.rebill events. Paid recurring schedules that came due get a
 * new ATTEMPTED invoice + payment link, and the client is emailed (best-effort).
 */
import { inngest } from "./index";
import { rebillDueInvoices } from "web/lib/billing/invoice-rebilling";

export const INVOICE_REBILL_RUN_EVENT = "billing/invoices.rebill";

export const invoiceRebillingJob = inngest.createFunction(
  {
    id: "invoice-rebilling",
    triggers: [
      { event: INVOICE_REBILL_RUN_EVENT },
      { cron: process.env.INVOICE_REBILL_CRON ?? "0 6 * * *" },
    ],
  },
  async ({ step }) => {
    const result = await step.run("rebill-sweep", () => rebillDueInvoices());
    return result;
  },
);

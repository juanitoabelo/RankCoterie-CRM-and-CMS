/**
 * Recurring client-invoice rebilling sweep.
 *
 * The schedule lives on the original (parent) invoice: `isRecurring`,
 * `interval`, `chargeDate`. Once a period is paid (APPROVED) and its chargeDate
 * is due, this sweep creates a new ATTEMPTED invoice for the next period,
 * advances the parent's chargeDate past now (catching up missed periods one
 * period at a time), then best-effort creates a payment link + emails the
 * client. Failures on one invoice never block the rest.
 */
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { createInvoicePaymentLink } from "./client-payments";
import { sendInvoicePaymentEmail } from "@/lib/email/invoices";

export type RebillResult = {
  scanned: number;
  created: number;
  linked: number;
  emailed: number;
  errors: number;
};

function addMonthsClamped(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/** Next charge date for a legacy BillInterval (UTC month math, end-of-month clamped). */
export function advanceChargeDate(from: Date, interval: string): Date {
  switch ((interval || "MONTHLY").toUpperCase()) {
    case "WEEKLY": {
      const d = new Date(from.getTime());
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    }
    case "BIWEEKLY": {
      const d = new Date(from.getTime());
      d.setUTCDate(d.getUTCDate() + 14);
      return d;
    }
    case "QUARTERLY":
      return addMonthsClamped(from, 3);
    case "ANNUAL":
      return addMonthsClamped(from, 12);
    case "MONTHLY":
    default:
      return addMonthsClamped(from, 1);
  }
}

/** Create next-period invoices for paid recurring schedules that came due. */
export async function rebillDueInvoices(now: Date = new Date()): Promise<RebillResult> {
  const due = await prisma.invoice.findMany({
    where: {
      isRecurring: true,
      status: "APPROVED",
      interval: { not: null },
      chargeDate: { lte: now },
    },
    include: { client: true },
    orderBy: { chargeDate: "asc" },
    take: 100,
  });
  const result: RebillResult = { scanned: due.length, created: 0, linked: 0, emailed: 0, errors: 0 };

  for (const inv of due) {
    try {
      const interval = inv.interval ?? "MONTHLY";
      const dueAt = inv.chargeDate ?? now;
      // Bill the period that came due now; schedule the NEXT period on the
      // parent. One period per sweep — still-missed periods drain on the next
      // run instead of being skipped.
      const next = advanceChargeDate(dueAt, interval);

      const child = await prisma.invoice.create({
        data: {
          clientId: inv.clientId,
          merchantId: inv.merchantId,
          amount: inv.amount,
          chargeDate: dueAt,
          status: "ATTEMPTED",
          isRecurring: false,
          retries: 0,
          responseMsg: `Recurring rebill (${interval.toLowerCase()} schedule ${inv.id.slice(-8)})`,
        },
      });
      await prisma.invoice.update({ where: { id: inv.id }, data: { chargeDate: next } });
      await logAudit({
        action: "INVOICE_CREATE",
        entity: "Invoice",
        entityId: child.id,
        reason: `Recurring rebill $${child.amount.toFixed(2)} for schedule ${inv.id} — next period ${next.toISOString().slice(0, 10)}`,
        meta: { scheduleId: inv.id, interval, clientId: inv.clientId },
      });
      result.created += 1;

      const link = await createInvoicePaymentLink(child.id);
      if (link.ok) {
        result.linked += 1;
        const to = inv.client.email?.trim();
        if (to) {
          const sent = await sendInvoicePaymentEmail({
            to,
            clientName: [inv.client.firstName, inv.client.lastName].filter(Boolean).join(" "),
            invoiceId: child.id,
            amount: child.amount.toFixed(2),
            payUrl: link.url,
          });
          if (sent.ok) {
            await prisma.invoice.update({ where: { id: child.id }, data: { emailSentAt: new Date() } });
            result.emailed += 1;
          }
        }
      }
    } catch (e) {
      result.errors += 1;
      console.warn(`[invoice-rebilling] rebill failed for ${inv.id}:`, e);
    }
  }

  return result;
}

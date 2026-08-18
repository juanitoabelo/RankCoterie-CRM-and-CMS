"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const INVOICE_STATUSES = ["ATTEMPTED", "APPROVED", "DECLINED", "ERROR", "REFUNDED", "CHARGEDBACK"];

export async function overrideInvoiceStatus(invoiceId: string, status: string): Promise<ActionResult> {
  if (!INVOICE_STATUSES.includes(status)) {
    return { ok: false, error: `Unknown invoice status "${status}".` };
  }
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return { ok: false, error: "Invoice not found." };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
  await logAudit({
    action: "INVOICE_STATUS_OVERRIDE",
    entity: "Invoice",
    entityId: invoiceId,
    reason: `Invoice ${invoiceId} status ${invoice.status} → ${status}`,
    meta: { from: invoice.status, to: status, clientId: invoice.clientId },
  });
  revalidatePath("/admin/invoices");
  return { ok: true, message: `Invoice marked ${status}.` };
}

// Form-action wrapper (Next 16: <form action> needs (FormData) => void | Promise<void>).
export async function invoiceStatusForm(formData: FormData): Promise<void> {
  await overrideInvoiceStatus(
    String(formData.get("invoiceId") ?? ""),
    String(formData.get("status") ?? ""),
  );
}

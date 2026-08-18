"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; message?: string };

const LEAD_STATUSES = ["NEW", "OPEN", "CLOSED", "ARCHIVED"] as const;

export async function changeLeadStatus(
  leadId: string,
  status: string,
  disposition: string | null,
): Promise<ActionResult> {
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: `Unknown lead status "${status}".` };
  }
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };

  await prisma.lead.update({
    where: { id: leadId },
    data: { status, disposition: disposition || null, statusDate: new Date() },
  });
  await logAudit({
    action: "LEAD_STATUS_CHANGE",
    entity: "Lead",
    entityId: leadId,
    reason: `Status ${lead.status} → ${status}${disposition ? ` (${disposition})` : ""}`,
    meta: { from: lead.status, to: status, disposition: disposition ?? null },
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: `Lead moved to ${status}.` };
}

export async function addLeadNote(leadId: string, note: string): Promise<ActionResult> {
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };

  await prisma.leadNote.create({ data: { leadId, note: trimmed } });
  await logAudit({
    action: "LEAD_NOTE_ADD",
    entity: "LeadNote",
    entityId: leadId,
    reason: `Note added to lead ${lead.firstName} ${lead.lastName}`.trim(),
  });
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function toggleTodo(todoId: string): Promise<ActionResult> {
  const todo = await prisma.toDo.findUnique({ where: { id: todoId } });
  if (!todo) return { ok: false, error: "Todo not found." };
  const nowFinished = todo.finishedAt === null;
  await prisma.toDo.update({
    where: { id: todoId },
    data: { finishedAt: nowFinished ? new Date() : null, status: nowFinished ? "DONE" : "OPEN" },
  });
  await logAudit({
    action: "TODO_TOGGLE",
    entity: "ToDo",
    entityId: todoId,
    reason: nowFinished ? `Completed todo "${todo.text}"` : `Reopened todo "${todo.text}"`,
  });
  revalidatePath("/admin/leads");
  if (todo.leadId) revalidatePath(`/admin/leads/${todo.leadId}`);
  return { ok: true };
}

// Form-action wrappers (Next 16: <form action> needs (FormData) => void | Promise<void>).
export async function leadStatusForm(formData: FormData): Promise<void> {
  await changeLeadStatus(
    String(formData.get("leadId") ?? ""),
    String(formData.get("status") ?? ""),
    String(formData.get("disposition") ?? "") || null,
  );
}

export async function leadNoteForm(formData: FormData): Promise<void> {
  await addLeadNote(String(formData.get("leadId") ?? ""), String(formData.get("note") ?? ""));
}

export async function leadTodoForm(formData: FormData): Promise<void> {
  await toggleTodo(String(formData.get("todoId") ?? ""));
}

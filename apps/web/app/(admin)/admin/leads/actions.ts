"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import {
  LEAD_DISPOSITIONS,
  LEAD_INTAKE_FIELDS,
  LEAD_INTAKE_FIELD_MAP,
  parseIntakeValue,
} from "@/modules/leads";

export type ActionResult = { ok: boolean; error?: string; message?: string; id?: string };

const LEAD_STATUSES = ["NEW", "OPEN", "CLOSED", "ARCHIVED"] as const;

function actorName(user: { firstName: string | null; lastName: string | null; email: string }): string {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

/** Redirect helpers that surface action failures on the page that submitted the form. */
function leadError(leadId: string, error: string): never {
  redirect(`/admin/leads/${leadId}?error=${encodeURIComponent(error)}`);
}
function leadsListError(error: string): never {
  redirect(`/admin/leads?error=${encodeURIComponent(error)}`);
}
function newLeadError(error: string): never {
  redirect(`/admin/leads/new?error=${encodeURIComponent(error)}`);
}

function buildPhones(home?: string, work?: string, cell?: string, fallback?: unknown) {
  const phones = [
    home?.trim() && { number: home.trim(), kind: "home" },
    work?.trim() && { number: work.trim(), kind: "work" },
    cell?.trim() && { number: cell.trim(), kind: "cell" },
  ].filter(Boolean) as { number: string; kind: string }[];
  if (phones.length === 0 && Array.isArray(fallback)) {
    // Preserve phones with unknown kinds (e.g. migrated legacy rows) when no edit is supplied.
    return fallback as { number: string; kind: string }[];
  }
  return phones;
}

function buildShippingAddress(input: {
  shipAddress1?: string;
  shipAddress2?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  shipCountry?: string;
}) {
  const has = [input.shipAddress1, input.shipCity, input.shipState, input.shipZip].some((v) => v?.trim());
  if (!has) return [];
  return [
    {
      line1: input.shipAddress1?.trim() || null,
      line2: input.shipAddress2?.trim() || null,
      city: input.shipCity?.trim() || null,
      state: input.shipState?.trim() || null,
      zip: input.shipZip?.trim() || null,
      country: input.shipCountry?.trim() || "US",
      kind: "shipping",
    },
  ];
}

export async function addLead(input: {
  firstName: string;
  lastName: string;
  email?: string;
  phoneHome?: string;
  phoneWork?: string;
  phoneCell?: string;
  status?: string;
  disposition?: string;
  campaignId?: string;
  assignedToId?: string;
  bestContact?: string;
  shipAddress1?: string;
  shipCity?: string;
  shipState?: string;
  shipZip?: string;
  shipCountry?: string;
  intake?: Record<string, unknown>;
}): Promise<ActionResult> {
  const user = await requireSection("leads");
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email?.trim() || null;
  if (!firstName && !lastName) {
    return { ok: false, error: "First or last name is required." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const assignedToId = input.assignedToId?.trim() || null;
  if (assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee) return { ok: false, error: "Assigned user not found." };
  }

  const phones = buildPhones(input.phoneHome, input.phoneWork, input.phoneCell);
  const addresses = buildShippingAddress(input);

  // Clinical/parent intake (legacy PatientName…ChristianProgram + BestContact + comments)
  const intake: Record<string, unknown> = { ...(input.intake ?? {}) };
  if (input.bestContact?.trim()) intake.bestContact = input.bestContact.trim();
  for (const [k, v] of Object.entries(intake)) {
    if (v === "" || v === null || v === undefined) delete intake[k];
    else if (typeof v === "string") intake[k] = v.trim();
  }

  const status = (LEAD_STATUSES as readonly string[]).includes(input.status ?? "")
    ? input.status!
    : "NEW";
  const disposition =
    input.disposition?.trim() &&
    (LEAD_DISPOSITIONS as readonly string[]).includes(input.disposition.trim())
      ? input.disposition.trim()
      : input.disposition?.trim() || null;

  const lead = await prisma.lead.create({
    data: {
      tenantId: TENANT_ID,
      firstName: firstName || null,
      lastName: lastName || null,
      email,
      phones,
      addresses,
      status,
      disposition,
      initialDisposition: disposition,
      statusDate: new Date(),
      assignedToId,
      campaignId: input.campaignId?.trim() || null,
      intake: intake as Prisma.InputJsonValue,
    },
  });
  await logAudit({
    action: "LEAD_CREATE",
    entity: "Lead",
    entityId: lead.id,
    actorId: user.id,
    reason: `Lead "${firstName} ${lastName}" created manually`,
  });
  revalidatePath("/admin/leads");
  return { ok: true, message: `Lead ${firstName} ${lastName} created.`, id: lead.id };
}

/** Edit the contact block of a lead (legacy Home/Work/Cell + Shipping* columns). */
export async function updateLeadContact(
  leadId: string,
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phoneHome?: string;
    phoneWork?: string;
    phoneCell?: string;
    shipAddress1?: string;
    shipCity?: string;
    shipState?: string;
    shipZip?: string;
    shipCountry?: string;
  },
): Promise<ActionResult> {
  const user = await requireSection("leads");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email?.trim() || null;
  if (!firstName && !lastName) return { ok: false, error: "First or last name is required." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const phones = buildPhones(input.phoneHome, input.phoneWork, input.phoneCell, lead.phones);
  const oldAddresses = Array.isArray(lead.addresses)
    ? (lead.addresses as Record<string, unknown>[])
    : [];
  const nonShipping = oldAddresses.filter((a) => a.kind !== "shipping");
  const shipping = buildShippingAddress(input);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      firstName: firstName || null,
      lastName: lastName || null,
      email,
      phones,
      addresses: [...shipping, ...nonShipping] as Prisma.InputJsonValue,
    },
  });
  await logAudit({
    action: "LEAD_UPDATE",
    entity: "Lead",
    entityId: leadId,
    actorId: user.id,
    reason: `Lead contact updated`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Contact updated." };
}

export async function assignLead(leadId: string, userId: string): Promise<ActionResult> {
  const actor = await requireSection("leads");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };
  const assigneeId = userId.trim() || null;
  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) return { ok: false, error: "User not found." };
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { assignedToId: assigneeId },
  });

  // Legacy behavior: reassignment creates a follow-up todo for the new owner.
  if (assigneeId && assigneeId !== lead.assignedToId) {
    const due = new Date();
    due.setDate(due.getDate() + 1);
    await prisma.toDo.create({
      data: {
        leadId,
        assigneeId,
        text: `Follow up with ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim(),
        dueAt: due,
        status: "OPEN",
      },
    });
  }

  const assignee = assigneeId
    ? await prisma.user.findUnique({ where: { id: assigneeId } })
    : null;
  const assigneeName = assignee ? actorName(assignee) : "unassigned";
  await logAudit({
    action: "LEAD_ASSIGN",
    entity: "Lead",
    entityId: leadId,
    actorId: actor.id,
    reason: `Lead assigned to ${assigneeName}`,
    meta: { from: lead.assignedToId, to: assigneeId },
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: `Lead assigned to ${assigneeName}.` };
}

/**
 * Convert a lead into a client (legacy conversion rule).
 * Transactional + DB-level guard: at most one client per lead (Client.leadId @unique).
 */
export async function convertLeadToClient(leadId: string): Promise<ActionResult> {
  const user = await requireSection("leads");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };

  try {
    const client = await prisma.$transaction(async (tx) => {
      const existing = await tx.client.findUnique({ where: { leadId } });
      if (existing) return existing;
      const created = await tx.client.create({
        data: {
          tenantId: TENANT_ID,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phones: lead.phones as Prisma.InputJsonValue,
          addresses: lead.addresses as Prisma.InputJsonValue,
          assignedToId: lead.assignedToId,
          leadId: lead.id,
          campaignId: lead.campaignId,
          productId: lead.productId,
          publisherId: lead.publisherId,
          subId: lead.subId,
          clickId: lead.clickId,
          landingPageId: lead.landingPageId,
        },
      });
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: "CLOSED",
          disposition: "CONVERTED",
          closeUserId: user.id,
          statusDate: new Date(),
        },
      });
      return created;
    });
    await logAudit({
      action: "LEAD_CONVERT",
      entity: "Lead",
      entityId: leadId,
      actorId: user.id,
      reason: `Lead converted to client ${client.id}`,
      meta: { clientId: client.id },
    });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${leadId}`);
    revalidatePath("/admin/clients");
    return { ok: true, message: `Converted to client.`, id: client.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "This lead already has a client record." };
    }
    throw e;
  }
}

export async function changeLeadStatus(
  leadId: string,
  status: string,
  disposition: string | null,
): Promise<ActionResult> {
  const user = await requireSection("leads");
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) {
    return { ok: false, error: `Unknown lead status "${status}".` };
  }
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };
  const cleanDisposition = disposition?.trim() || null;
  if (cleanDisposition && !(LEAD_DISPOSITIONS as readonly string[]).includes(cleanDisposition)) {
    return { ok: false, error: `Unknown disposition "${cleanDisposition}".` };
  }
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status,
      disposition: cleanDisposition,
      closeUserId: status === "CLOSED" ? user.id : lead.closeUserId,
      statusDate: new Date(),
    },
  });
  await logAudit({
    action: "LEAD_STATUS_CHANGE",
    entity: "Lead",
    entityId: leadId,
    actorId: user.id,
    reason: `Status ${lead.status} → ${status}${cleanDisposition ? ` (${cleanDisposition})` : ""}`,
    meta: { from: lead.status, to: status, disposition: cleanDisposition },
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: `Lead moved to ${status}.` };
}

export async function addLeadNote(leadId: string, note: string): Promise<ActionResult> {
  const user = await requireSection("leads");
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "Note cannot be empty." };
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };

  await prisma.leadNote.create({ data: { leadId, note: trimmed, userId: user.id } });
  await logAudit({
    action: "LEAD_NOTE_ADD",
    entity: "LeadNote",
    entityId: leadId,
    actorId: user.id,
    reason: `Note added to lead ${lead.firstName} ${lead.lastName}`.trim(),
  });
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function deleteLeadNote(noteId: string): Promise<ActionResult> {
  const user = await requireSection("leads");
  const note = await prisma.leadNote.findUnique({ where: { id: noteId } });
  if (!note) return { ok: false, error: "Note not found." };
  await prisma.leadNote.delete({ where: { id: noteId } });
  await logAudit({
    action: "LEAD_NOTE_DELETE",
    entity: "LeadNote",
    entityId: noteId,
    actorId: user.id,
    reason: `Note deleted from lead ${note.leadId}`,
  });
  revalidatePath(`/admin/leads/${note.leadId}`);
  return { ok: true };
}

export async function addTodo(
  leadId: string,
  text: string,
  dueAt?: string,
  assigneeId?: string,
): Promise<ActionResult> {
  const user = await requireSection("leads");
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "To-do cannot be empty." };
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };
  let due: Date | null = null;
  if (dueAt?.trim()) {
    due = new Date(dueAt.trim());
    if (Number.isNaN(due.getTime())) return { ok: false, error: "Invalid due date." };
  }
  // Legacy "User" column: explicit assignee, otherwise the lead owner.
  let assignee = lead.assignedToId;
  const requested = assigneeId?.trim() || null;
  if (requested) {
    const assigneeRow = await prisma.user.findUnique({ where: { id: requested } });
    if (!assigneeRow) return { ok: false, error: "Assigned user not found." };
    assignee = assigneeRow.id;
  }
  await prisma.toDo.create({
    data: { leadId, assigneeId: assignee, text: trimmed, dueAt: due, status: "OPEN" },
  });
  await logAudit({
    action: "TODO_CREATE",
    entity: "ToDo",
    entityId: leadId,
    actorId: user.id,
    reason: `To-do "${trimmed}" added to lead`,
  });
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true };
}

export async function toggleTodo(todoId: string): Promise<ActionResult> {
  const user = await requireSection("leads");
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
    actorId: user.id,
    reason: nowFinished ? `Completed todo "${todo.text}"` : `Reopened todo "${todo.text}"`,
  });
  revalidatePath("/admin/leads");
  if (todo.leadId) revalidatePath(`/admin/leads/${todo.leadId}`);
  return { ok: true };
}

export async function deleteTodo(todoId: string): Promise<ActionResult> {
  const user = await requireSection("leads");
  const todo = await prisma.toDo.findUnique({ where: { id: todoId } });
  if (!todo) return { ok: false, error: "Todo not found." };
  await prisma.toDo.delete({ where: { id: todoId } });
  await logAudit({
    action: "TODO_DELETE",
    entity: "ToDo",
    entityId: todoId,
    actorId: user.id,
    reason: `To-do "${todo.text}" deleted`,
  });
  if (todo.leadId) revalidatePath(`/admin/leads/${todo.leadId}`);
  return { ok: true };
}

/** Delete a lead and everything attached (notes/todos). Converted clients survive with a dangling-safe null link. */
export async function deleteLead(leadId: string): Promise<ActionResult> {
  const user = await requireSection("leads");
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { client: { select: { id: true } } },
  });
  if (!lead) return { ok: false, error: "Lead not found." };

  await prisma.$transaction([
    prisma.leadNote.deleteMany({ where: { leadId } }),
    prisma.toDo.deleteMany({ where: { leadId } }),
    prisma.listingLead.updateMany({ where: { leadId }, data: { leadId: null } }),
    prisma.lead.delete({ where: { id: leadId } }),
  ]);
  await logAudit({
    action: "LEAD_DELETE",
    entity: "Lead",
    entityId: leadId,
    actorId: user.id,
    reason: `Lead "${lead.firstName} ${lead.lastName}" deleted${lead.client ? ` (client ${lead.client.id} kept)` : ""}`,
    meta: { clientId: lead.client?.id ?? null },
  });
  revalidatePath("/admin/leads");
  revalidatePath("/admin/clients");
  return { ok: true, message: "Lead deleted." };
}

export async function updateLeadIntake(leadId: string, intakeJson: string): Promise<ActionResult> {
  const user = await requireSection("leads");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };

  const trimmed = intakeJson.trim();
  let parsed: unknown = {};
  if (trimmed) {
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return { ok: false, error: "Intake must be valid JSON." };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Intake must be a JSON object (key/value pairs)." };
    }
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { intake: parsed as Prisma.InputJsonValue },
  });
  await logAudit({
    action: "LEAD_UPDATE",
    entity: "Lead",
    entityId: leadId,
    actorId: user.id,
    reason: `Lead intake/custom fields updated`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Intake updated." };
}

/**
 * Save the schema-driven intake sections (legacy Lead information /
 * Patient-child profile / Parent profile). Keys outside the schema — migrated
 * legacy values or custom JSON keys — are preserved untouched.
 */
export async function updateLeadIntakeFields(
  leadId: string,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireSection("leads");
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found." };

  const existing = (lead.intake ?? {}) as Record<string, unknown>;
  const unmapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existing)) {
    if (!LEAD_INTAKE_FIELD_MAP[key]) unmapped[key] = value;
  }

  const schemaValues: Record<string, unknown> = {};
  for (const field of LEAD_INTAKE_FIELDS) {
    const value = parseIntakeValue(field, formData.get(field.key));
    if (value !== undefined) schemaValues[field.key] = value;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: { intake: { ...unmapped, ...schemaValues } as Prisma.InputJsonValue },
  });
  await logAudit({
    action: "LEAD_UPDATE",
    entity: "Lead",
    entityId: leadId,
    actorId: user.id,
    reason: `Lead intake sections updated (${Object.keys(schemaValues).length} fields)`,
  });
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);
  return { ok: true, message: "Intake saved." };
}

// ---------------------------------------------------------------------------
// Form-action wrappers (Next 16: <form action> needs (FormData) => void | Promise<void>).
// Failures redirect back to the submitting page with ?error= so nothing fails silently.
// ---------------------------------------------------------------------------

export async function leadStatusForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await changeLeadStatus(
    leadId,
    String(formData.get("status") ?? ""),
    String(formData.get("disposition") ?? "") || null,
  );
  if (!result.ok) leadError(leadId, result.error ?? "Could not update status.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent(result.message ?? "Status updated.")}`);
}

export async function leadNoteForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await addLeadNote(leadId, String(formData.get("note") ?? ""));
  if (!result.ok) leadError(leadId, result.error ?? "Could not add note.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent("Note added.")}`);
}

export async function leadNoteDeleteForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await deleteLeadNote(String(formData.get("noteId") ?? ""));
  if (!result.ok) leadError(leadId, result.error ?? "Could not delete note.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent("Note deleted.")}`);
}

export async function leadTodoForm(formData: FormData): Promise<void> {
  const todoId = String(formData.get("todoId") ?? "");
  const todo = await prisma.toDo.findUnique({ where: { id: todoId } });
  const result = await toggleTodo(todoId);
  if (!result.ok) leadError(todo?.leadId ?? "", result.error ?? "Could not update to-do.");
  redirect(`/admin/leads/${todo?.leadId}?ok=${encodeURIComponent("To-do updated.")}`);
}

export async function leadTodoAddForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await addTodo(
    leadId,
    String(formData.get("text") ?? ""),
    String(formData.get("dueAt") ?? ""),
    String(formData.get("assigneeId") ?? ""),
  );
  if (!result.ok) leadError(leadId, result.error ?? "Could not add to-do.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent("To-do added.")}`);
}

export async function leadTodoDeleteForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await deleteTodo(String(formData.get("todoId") ?? ""));
  if (!result.ok) leadError(leadId, result.error ?? "Could not delete to-do.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent("To-do deleted.")}`);
}

export async function leadContactForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await updateLeadContact(leadId, {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneHome: String(formData.get("phoneHome") ?? ""),
    phoneWork: String(formData.get("phoneWork") ?? ""),
    phoneCell: String(formData.get("phoneCell") ?? ""),
    shipAddress1: String(formData.get("shipAddress1") ?? ""),
    shipCity: String(formData.get("shipCity") ?? ""),
    shipState: String(formData.get("shipState") ?? ""),
    shipZip: String(formData.get("shipZip") ?? ""),
    shipCountry: String(formData.get("shipCountry") ?? ""),
  });
  if (!result.ok) leadError(leadId, result.error ?? "Could not update contact.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent("Contact updated.")}`);
}

export async function leadAddForm(formData: FormData): Promise<void> {
  const intake: Record<string, unknown> = {};
  for (const field of LEAD_INTAKE_FIELDS) {
    const value = parseIntakeValue(field, formData.get(field.key));
    if (value !== undefined) intake[field.key] = value;
  }
  const result = await addLead({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phoneHome: String(formData.get("phoneHome") ?? ""),
    phoneWork: String(formData.get("phoneWork") ?? ""),
    phoneCell: String(formData.get("phoneCell") ?? ""),
    status: String(formData.get("status") ?? "NEW"),
    disposition: String(formData.get("disposition") ?? ""),
    campaignId: String(formData.get("campaignId") ?? ""),
    assignedToId: String(formData.get("assignedToId") ?? ""),
    bestContact: String(formData.get("bestContact") ?? ""),
    shipAddress1: String(formData.get("shipAddress1") ?? ""),
    shipCity: String(formData.get("shipCity") ?? ""),
    shipState: String(formData.get("shipState") ?? ""),
    shipZip: String(formData.get("shipZip") ?? ""),
    shipCountry: String(formData.get("shipCountry") ?? ""),
    intake,
  });
  if (!result.ok) newLeadError(result.error ?? "Could not create lead.");
  if (!result.id) newLeadError("Could not create lead.");
  redirect(`/admin/leads/${result.id}?ok=${encodeURIComponent("Lead created.")}`);
}

export async function leadAssignForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await assignLead(leadId, String(formData.get("userId") ?? ""));
  if (!result.ok) leadError(leadId, result.error ?? "Could not assign lead.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent(result.message ?? "Lead assigned.")}`);
}

export async function leadConvertForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await convertLeadToClient(leadId);
  if (!result.ok) leadError(leadId, result.error ?? "Could not convert lead.");
  if (!result.id) leadsListError("Converted, but client id missing.");
  redirect(`/admin/clients/${result.id}?ok=${encodeURIComponent("Lead converted to client.")}`);
}

export async function leadIntakeForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await updateLeadIntake(leadId, String(formData.get("intake") ?? ""));
  if (!result.ok) leadError(leadId, result.error ?? "Could not save intake.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent("Intake saved.")}`);
}

export async function leadIntakeFormFields(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await updateLeadIntakeFields(leadId, formData);
  if (!result.ok) leadError(leadId, result.error ?? "Could not save intake.");
  redirect(`/admin/leads/${leadId}?ok=${encodeURIComponent("Intake saved.")}`);
}

export async function leadDeleteForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await deleteLead(leadId);
  if (!result.ok) leadsListError(result.error ?? "Could not delete lead.");
  redirect(`/admin/leads?ok=${encodeURIComponent("Lead deleted.")}`);
}

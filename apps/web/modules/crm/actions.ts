"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { logCrmActivity } from "./activity";
import {
  CRM_ACTIVITY_TYPES,
  CRM_TASK_PRIORITIES,
  type CrmActivityType,
} from "./constants";
import { getCrmStages, getDefaultCrmStage } from "./stages";
import { saveCrmSettings } from "./settings";
import { recalculateLeadScores, updateLeadScore } from "./scoring";

export type CrmActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
  id?: string;
};

function parseMoney(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").replace(/[$,\s]/g, "");
  if (!raw) return 0;
  const number = Number(raw);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function parseDate(value: FormDataEntryValue | null): Date | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(`${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "invalid" : date;
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null | "invalid" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = Number(raw);
  return Number.isInteger(number) && number >= 0 && number <= 100 ? number : "invalid";
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "stage"
  );
}

function safeCrmReturn(value: FormDataEntryValue | null, fallback: string): string {
  const raw = String(value ?? "");
  return raw.startsWith("/admin/crm") ? raw : fallback;
}

function dealError(dealId: string, error: string): never {
  redirect(`/admin/crm/deals/${dealId}?error=${encodeURIComponent(error)}`);
}

function newDealError(error: string): never {
  redirect(`/admin/crm/deals/new?error=${encodeURIComponent(error)}`);
}

function revalidateCrm(dealId?: string) {
  revalidatePath("/admin/crm");
  revalidatePath("/admin/crm/pipeline");
  revalidatePath("/admin/crm/deals");
  revalidatePath("/admin/crm/activities");
  revalidatePath("/admin/crm/settings");
  if (dealId) revalidatePath(`/admin/crm/deals/${dealId}`);
}

function revalidateEntity(entity: {
  leadId?: string | null;
  clientId?: string | null;
  dealId?: string | null;
}) {
  revalidateCrm(entity.dealId ?? undefined);
  if (entity.leadId) revalidatePath(`/admin/leads/${entity.leadId}`);
  if (entity.clientId) revalidatePath(`/admin/clients/${entity.clientId}`);
}

async function validateStage(stageId: string) {
  const stage = await prisma.crmStage.findFirst({
    where: { id: stageId, tenantId: TENANT_ID, active: true },
  });
  return stage;
}

async function validateOwner(ownerId: string | null) {
  if (!ownerId) return true;
  const user = await prisma.user.findFirst({
    where: { id: ownerId, tenantId: TENANT_ID, active: true },
    select: { id: true },
  });
  return Boolean(user);
}

async function validateLead(leadId: string | null) {
  if (!leadId) return true;
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: TENANT_ID },
    select: { id: true },
  });
  return Boolean(lead);
}

async function validateClient(clientId: string | null) {
  if (!clientId) return true;
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: TENANT_ID },
    select: { id: true },
  });
  return Boolean(client);
}

async function validateDeal(dealId: string | null) {
  if (!dealId) return true;
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID },
    select: { id: true },
  });
  return Boolean(deal);
}

export async function createDeal(input: {
  title: string;
  value?: string;
  currency?: string;
  stageId?: string;
  probability?: string;
  expectedCloseDate?: string;
  source?: string;
  ownerId?: string;
  leadId?: string;
  clientId?: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Deal title is required." };

  const value = parseMoney(input.value ?? "0");
  if (value === null) return { ok: false, error: "Deal value must be a positive number." };
  const probability = parseOptionalInt(input.probability ?? "");
  if (probability === "invalid") {
    return { ok: false, error: "Probability must be a whole number between 0 and 100." };
  }
  const expectedCloseDate = parseDate(input.expectedCloseDate ?? "");
  if (expectedCloseDate === "invalid") return { ok: false, error: "Invalid expected close date." };

  const stage = input.stageId?.trim()
    ? await validateStage(input.stageId.trim())
    : await getDefaultCrmStage();
  if (!stage) return { ok: false, error: "No pipeline stage is available." };

  const ownerId = input.ownerId?.trim() || null;
  if (!(await validateOwner(ownerId))) return { ok: false, error: "Owner not found." };
  const leadId = input.leadId?.trim() || null;
  if (!(await validateLead(leadId))) return { ok: false, error: "Linked lead not found." };
  const clientId = input.clientId?.trim() || null;
  if (!(await validateClient(clientId))) return { ok: false, error: "Linked client not found." };

  const deal = await prisma.deal.create({
    data: {
      tenantId: TENANT_ID,
      title,
      value: new Prisma.Decimal(value.toFixed(2)),
      currency: input.currency?.trim().toUpperCase().slice(0, 3) || "USD",
      stageId: stage.id,
      probability,
      expectedCloseDate,
      source: input.source?.trim() || null,
      ownerId,
      leadId,
      clientId,
      companyName: input.companyName?.trim() || null,
      contactName: input.contactName?.trim() || null,
      contactEmail: input.contactEmail?.trim() || null,
      contactPhone: input.contactPhone?.trim() || null,
      notes: input.notes?.trim() || null,
      lastActivityAt: new Date(),
    },
  });

  await logCrmActivity({
    type: "SYSTEM",
    subject: "Deal created",
    body: `${title} created in ${stage.label}.`,
    userId: user.id,
    leadId,
    clientId,
    dealId: deal.id,
    metadata: { stageId: stage.id },
  });
  await logAudit({
    action: "DEAL_CREATE",
    entity: "Deal",
    entityId: deal.id,
    actorId: user.id,
    reason: `Deal "${title}" created`,
    meta: { value, stageId: stage.id, ownerId, leadId, clientId },
  });
  revalidateEntity({ leadId, clientId, dealId: deal.id });
  return { ok: true, message: "Deal created.", id: deal.id };
}

export async function updateDeal(
  dealId: string,
  input: {
    title?: string;
    value?: string;
    currency?: string;
    stageId?: string;
    probability?: string;
    expectedCloseDate?: string;
    source?: string;
    ownerId?: string;
    leadId?: string;
    clientId?: string;
    companyName?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    notes?: string;
    lostReason?: string;
  },
): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID },
    include: { stage: true },
  });
  if (!deal) return { ok: false, error: "Deal not found." };

  const data: Prisma.DealUpdateInput = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Deal title is required." };
    data.title = title;
  }
  if (input.value !== undefined) {
    const value = parseMoney(input.value);
    if (value === null) return { ok: false, error: "Deal value must be a positive number." };
    data.value = new Prisma.Decimal(value.toFixed(2));
  }
  if (input.currency !== undefined) {
    data.currency = input.currency.trim().toUpperCase().slice(0, 3) || deal.currency;
  }
  if (input.probability !== undefined) {
    const probability = parseOptionalInt(input.probability);
    if (probability === "invalid") {
      return { ok: false, error: "Probability must be a whole number between 0 and 100." };
    }
    data.probability = probability;
  }
  if (input.expectedCloseDate !== undefined) {
    const date = parseDate(input.expectedCloseDate);
    if (date === "invalid") return { ok: false, error: "Invalid expected close date." };
    data.expectedCloseDate = date;
  }
  if (input.source !== undefined) data.source = input.source.trim() || null;
  if (input.companyName !== undefined) data.companyName = input.companyName.trim() || null;
  if (input.contactName !== undefined) data.contactName = input.contactName.trim() || null;
  if (input.contactEmail !== undefined) data.contactEmail = input.contactEmail.trim() || null;
  if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone.trim() || null;
  if (input.notes !== undefined) data.notes = input.notes.trim() || null;

  let nextStage = deal.stage;
  if (input.stageId !== undefined) {
    const stage = await validateStage(input.stageId);
    if (!stage) return { ok: false, error: "Pipeline stage not found." };
    nextStage = stage;
    data.stage = { connect: { id: stage.id } };
  }
  if (input.ownerId !== undefined) {
    const ownerId = input.ownerId.trim() || null;
    if (!(await validateOwner(ownerId))) return { ok: false, error: "Owner not found." };
    data.ownerId = ownerId;
  }
  if (input.leadId !== undefined) {
    const leadId = input.leadId.trim() || null;
    if (!(await validateLead(leadId))) return { ok: false, error: "Linked lead not found." };
    data.lead = leadId ? { connect: { id: leadId } } : { disconnect: true };
  }
  if (input.clientId !== undefined) {
    const clientId = input.clientId.trim() || null;
    if (!(await validateClient(clientId))) return { ok: false, error: "Linked client not found." };
    data.client = clientId ? { connect: { id: clientId } } : { disconnect: true };
  }

  const stageChanged = nextStage.id !== deal.stageId;
  if (stageChanged) {
    data.stageChangedAt = new Date();
    data.lastActivityAt = new Date();
    if (nextStage.isWon) {
      data.wonAt = new Date();
      data.closedAt = new Date();
      data.lostReason = null;
    } else if (nextStage.isLost) {
      data.wonAt = null;
      data.closedAt = new Date();
      data.lostReason = input.lostReason?.trim() || deal.lostReason;
    } else {
      data.wonAt = null;
      data.closedAt = null;
      data.lostReason = null;
    }
  }

  const updated = await prisma.deal.update({ where: { id: dealId }, data });

  if (stageChanged) {
    await logCrmActivity({
      type: "STAGE_CHANGE",
      subject: `${deal.stage.label} → ${nextStage.label}`,
      body: input.lostReason?.trim() || null,
      userId: user.id,
      leadId: updated.leadId,
      clientId: updated.clientId,
      dealId: updated.id,
      metadata: { from: deal.stageId, to: nextStage.id },
    });
  }

  await logAudit({
    action: "DEAL_UPDATE",
    entity: "Deal",
    entityId: dealId,
    actorId: user.id,
    reason: stageChanged
      ? `Deal "${updated.title}" moved ${deal.stage.label} → ${nextStage.label}`
      : `Deal "${updated.title}" updated`,
    meta: { stageChanged, fromStage: deal.stageId, toStage: nextStage.id },
  });
  revalidateEntity({ leadId: updated.leadId, clientId: updated.clientId, dealId });
  return { ok: true, message: "Deal updated.", id: updated.id };
}

export async function changeDealStage(
  dealId: string,
  stageId: string,
): Promise<CrmActionResult> {
  return updateDeal(dealId, { stageId });
}

export async function deleteDeal(dealId: string): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId: TENANT_ID } });
  if (!deal) return { ok: false, error: "Deal not found." };
  await prisma.deal.delete({ where: { id: dealId } });
  await logAudit({
    action: "DEAL_DELETE",
    entity: "Deal",
    entityId: dealId,
    actorId: user.id,
    reason: `Deal "${deal.title}" deleted`,
  });
  revalidateEntity({ leadId: deal.leadId, clientId: deal.clientId });
  return { ok: true, message: "Deal deleted." };
}

export async function addCrmActivity(input: {
  type: string;
  subject?: string;
  body?: string;
  occurredAt?: string;
  leadId?: string;
  clientId?: string;
  dealId?: string;
}): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  if (!(CRM_ACTIVITY_TYPES as readonly string[]).includes(input.type)) {
    return { ok: false, error: "Unknown activity type." };
  }
  const subject = input.subject?.trim() || "";
  const body = input.body?.trim() || "";
  if (!subject && !body) return { ok: false, error: "Add a subject or body." };
  const leadId = input.leadId?.trim() || null;
  const clientId = input.clientId?.trim() || null;
  const dealId = input.dealId?.trim() || null;
  if (!leadId && !clientId && !dealId) {
    return { ok: false, error: "Link the activity to a lead, client, or deal." };
  }
  if (!(await validateLead(leadId))) return { ok: false, error: "Lead not found." };
  if (!(await validateClient(clientId))) return { ok: false, error: "Client not found." };
  if (!(await validateDeal(dealId))) return { ok: false, error: "Deal not found." };

  let occurredAt: Date | undefined;
  if (input.occurredAt?.trim()) {
    const date = new Date(input.occurredAt);
    if (Number.isNaN(date.getTime())) return { ok: false, error: "Invalid activity date." };
    occurredAt = date;
  }

  const activity = await logCrmActivity({
    type: input.type as CrmActivityType,
    subject: subject || null,
    body: body || null,
    occurredAt,
    userId: user.id,
    leadId,
    clientId,
    dealId,
  });
  await logAudit({
    action: "CRM_ACTIVITY_ADD",
    entity: "CrmActivity",
    entityId: activity.id,
    actorId: user.id,
    reason: `${input.type} activity logged`,
    meta: { leadId, clientId, dealId },
  });
  revalidateEntity({ leadId, clientId, dealId });
  return { ok: true, message: "Activity logged.", id: activity.id };
}

export async function addCrmTask(input: {
  text: string;
  dueAt?: string;
  priority?: string;
  assigneeId?: string;
  leadId?: string;
  clientId?: string;
  dealId?: string;
}): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const text = input.text.trim();
  if (!text) return { ok: false, error: "Task text is required." };
  const leadId = input.leadId?.trim() || null;
  const clientId = input.clientId?.trim() || null;
  const dealId = input.dealId?.trim() || null;
  if (!leadId && !clientId && !dealId) {
    return { ok: false, error: "Link the task to a lead, client, or deal." };
  }
  if (!(await validateLead(leadId))) return { ok: false, error: "Lead not found." };
  if (!(await validateClient(clientId))) return { ok: false, error: "Client not found." };
  if (!(await validateDeal(dealId))) return { ok: false, error: "Deal not found." };
  const priority = (input.priority ?? "NORMAL").toUpperCase();
  if (!(CRM_TASK_PRIORITIES as readonly string[]).includes(priority)) {
    return { ok: false, error: "Unknown task priority." };
  }
  let dueAt: Date | null = null;
  if (input.dueAt?.trim()) {
    dueAt = new Date(input.dueAt);
    if (Number.isNaN(dueAt.getTime())) return { ok: false, error: "Invalid task due date." };
  }
  const assigneeId = input.assigneeId?.trim() || null;
  if (!(await validateOwner(assigneeId))) return { ok: false, error: "Assignee not found." };

  const task = await prisma.toDo.create({
    data: { leadId, clientId, dealId, assigneeId, text, dueAt, priority, status: "OPEN" },
  });
  await logCrmActivity({
    type: "TASK",
    subject: `Task created: ${text}`,
    body: dueAt ? `Due ${dueAt.toISOString().slice(0, 10)}` : null,
    userId: user.id,
    leadId,
    clientId,
    dealId,
    metadata: { taskId: task.id, priority },
  });
  await logAudit({
    action: "CRM_TASK_CREATE",
    entity: "ToDo",
    entityId: task.id,
    actorId: user.id,
    reason: `CRM task "${text}" created`,
    meta: { leadId, clientId, dealId, priority },
  });
  revalidateEntity({ leadId, clientId, dealId });
  return { ok: true, message: "Task added.", id: task.id };
}

export async function toggleCrmTask(taskId: string): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const task = await prisma.toDo.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found." };
  const nowFinished = task.finishedAt === null;
  const updated = await prisma.toDo.update({
    where: { id: taskId },
    data: {
      finishedAt: nowFinished ? new Date() : null,
      status: nowFinished ? "DONE" : "OPEN",
    },
  });
  await logCrmActivity({
    type: "TASK",
    subject: nowFinished ? `Task completed: ${task.text}` : `Task reopened: ${task.text}`,
    userId: user.id,
    leadId: task.leadId,
    clientId: task.clientId,
    dealId: task.dealId,
    metadata: { taskId },
  });
  await logAudit({
    action: "CRM_TASK_TOGGLE",
    entity: "ToDo",
    entityId: taskId,
    actorId: user.id,
    reason: nowFinished ? `Completed task "${task.text}"` : `Reopened task "${task.text}"`,
  });
  revalidateEntity({
    leadId: updated.leadId,
    clientId: updated.clientId,
    dealId: updated.dealId,
  });
  return { ok: true, message: nowFinished ? "Task completed." : "Task reopened." };
}

export async function deleteCrmTask(taskId: string): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const task = await prisma.toDo.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found." };
  await prisma.toDo.delete({ where: { id: taskId } });
  await logAudit({
    action: "CRM_TASK_DELETE",
    entity: "ToDo",
    entityId: taskId,
    actorId: user.id,
    reason: `Deleted CRM task "${task.text}"`,
  });
  revalidateEntity({ leadId: task.leadId, clientId: task.clientId, dealId: task.dealId });
  return { ok: true, message: "Task deleted." };
}

export async function createDealFromLead(leadId: string): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId: TENANT_ID } });
  if (!lead) return { ok: false, error: "Lead not found." };
  const stage = await getDefaultCrmStage();
  if (!stage) return { ok: false, error: "No pipeline stage is available." };
  const phones = Array.isArray(lead.phones)
    ? (lead.phones as { number?: string }[])
    : [];
  const name = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.email || "Lead";
  const deal = await prisma.deal.create({
    data: {
      tenantId: TENANT_ID,
      title: name,
      stageId: stage.id,
      value: new Prisma.Decimal(0),
      ownerId: lead.assignedToId,
      leadId: lead.id,
      contactName: name,
      contactEmail: lead.email,
      contactPhone: phones.find((phone) => phone.number)?.number ?? null,
      source: "Lead",
      lastActivityAt: new Date(),
    },
  });
  await logCrmActivity({
    type: "SYSTEM",
    subject: "Deal created from lead",
    body: `${name} moved into the pipeline.`,
    userId: user.id,
    leadId: lead.id,
    dealId: deal.id,
  });
  await updateLeadScore(lead.id);
  await logAudit({
    action: "DEAL_CREATE",
    entity: "Deal",
    entityId: deal.id,
    actorId: user.id,
    reason: `Deal created from lead "${name}"`,
    meta: { leadId },
  });
  revalidateEntity({ leadId, dealId: deal.id });
  return { ok: true, message: "Deal created from lead.", id: deal.id };
}

export async function createDealFromClient(clientId: string): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: TENANT_ID } });
  if (!client) return { ok: false, error: "Client not found." };
  const stage = await getDefaultCrmStage();
  if (!stage) return { ok: false, error: "No pipeline stage is available." };
  const phones = Array.isArray(client.phones)
    ? (client.phones as { number?: string }[])
    : [];
  const name = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || client.email || "Client";
  const deal = await prisma.deal.create({
    data: {
      tenantId: TENANT_ID,
      title: name,
      stageId: stage.id,
      value: new Prisma.Decimal(0),
      ownerId: client.assignedToId,
      clientId: client.id,
      contactName: name,
      contactEmail: client.email,
      contactPhone: phones.find((phone) => phone.number)?.number ?? null,
      source: "Client",
      lastActivityAt: new Date(),
    },
  });
  await logCrmActivity({
    type: "SYSTEM",
    subject: "Deal created from client",
    body: `${name} added to the pipeline.`,
    userId: user.id,
    clientId: client.id,
    dealId: deal.id,
  });
  await logAudit({
    action: "DEAL_CREATE",
    entity: "Deal",
    entityId: deal.id,
    actorId: user.id,
    reason: `Deal created from client "${name}"`,
    meta: { clientId },
  });
  revalidateEntity({ clientId, dealId: deal.id });
  return { ok: true, message: "Deal created from client.", id: deal.id };
}

export async function updateCrmStage(
  stageId: string,
  input: {
    label?: string;
    probability?: number;
    order?: number;
    isWon?: boolean;
    isLost?: boolean;
    active?: boolean;
  },
): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const stage = await prisma.crmStage.findFirst({
    where: { id: stageId, tenantId: TENANT_ID },
  });
  if (!stage) return { ok: false, error: "Stage not found." };
  const label = input.label?.trim() || stage.label;
  if (!label) return { ok: false, error: "Stage label is required." };
  const probability =
    typeof input.probability === "number"
      ? Math.max(0, Math.min(100, Math.round(input.probability)))
      : stage.probability;
  const order =
    typeof input.order === "number" && Number.isFinite(input.order)
      ? Math.round(input.order)
      : stage.order;
  const isWon = typeof input.isWon === "boolean" ? input.isWon : stage.isWon;
  const isLost = isWon ? false : typeof input.isLost === "boolean" ? input.isLost : stage.isLost;
  const updated = await prisma.crmStage.update({
    where: { id: stageId },
    data: {
      label,
      probability,
      order,
      isWon,
      isLost,
      active: typeof input.active === "boolean" ? input.active : stage.active,
    },
  });
  await logAudit({
    action: "CRM_STAGE_UPDATE",
    entity: "CrmStage",
    entityId: stageId,
    actorId: user.id,
    reason: `Pipeline stage "${updated.label}" updated`,
  });
  revalidateCrm();
  return { ok: true, message: "Stage updated.", id: updated.id };
}

export async function createCrmStage(input: {
  label: string;
  probability?: number;
  order?: number;
  isWon?: boolean;
  isLost?: boolean;
}): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Stage label is required." };
  const stages = await getCrmStages();
  let key = slugify(label);
  let suffix = 2;
  while (stages.some((stage) => stage.key === key)) {
    key = `${slugify(label)}-${suffix}`;
    suffix += 1;
  }
  const probability = Math.max(0, Math.min(100, Math.round(input.probability ?? 0)));
  const order =
    typeof input.order === "number" && Number.isFinite(input.order)
      ? Math.round(input.order)
      : Math.max(0, ...stages.map((stage) => stage.order)) + 10;
  const isWon = Boolean(input.isWon);
  const stage = await prisma.crmStage.create({
    data: {
      tenantId: TENANT_ID,
      key,
      label,
      probability,
      order,
      isWon,
      isLost: isWon ? false : Boolean(input.isLost),
    },
  });
  await logAudit({
    action: "CRM_STAGE_CREATE",
    entity: "CrmStage",
    entityId: stage.id,
    actorId: user.id,
    reason: `Pipeline stage "${stage.label}" created`,
  });
  revalidateCrm();
  return { ok: true, message: "Stage created.", id: stage.id };
}

export async function updateCrmSettings(input: {
  autoAssignLeads?: boolean;
  staleDealDays?: number;
  defaultCurrency?: string;
}): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const settings = await saveCrmSettings(input);
  await logAudit({
    action: "CRM_SETTINGS_UPDATE",
    entity: "CrmSetting",
    entityId: TENANT_ID,
    actorId: user.id,
    reason: "CRM settings updated",
    meta: settings,
  });
  revalidateCrm();
  return { ok: true, message: "CRM settings saved." };
}

export async function recalculateScores(): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const count = await recalculateLeadScores();
  await logAudit({
    action: "LEAD_SCORE_RECALCULATE",
    entity: "Lead",
    entityId: TENANT_ID,
    actorId: user.id,
    reason: `Recalculated ${count} lead scores`,
    meta: { count },
  });
  revalidatePath("/admin/leads");
  revalidateCrm();
  return { ok: true, message: `Recalculated ${count} lead score(s).` };
}

// ---------------------------------------------------------------------------
// Form-action wrappers
// ---------------------------------------------------------------------------

export async function crmDealCreateForm(formData: FormData): Promise<void> {
  const result = await createDeal({
    title: String(formData.get("title") ?? ""),
    value: String(formData.get("value") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    stageId: String(formData.get("stageId") ?? ""),
    probability: String(formData.get("probability") ?? ""),
    expectedCloseDate: String(formData.get("expectedCloseDate") ?? ""),
    source: String(formData.get("source") ?? ""),
    ownerId: String(formData.get("ownerId") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!result.ok) newDealError(result.error ?? "Could not create deal.");
  if (!result.id) newDealError("Could not create deal.");
  redirect(`/admin/crm/deals/${result.id}?ok=${encodeURIComponent("Deal created.")}`);
}

export async function crmDealUpdateForm(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const result = await updateDeal(dealId, {
    title: String(formData.get("title") ?? ""),
    value: String(formData.get("value") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    stageId: String(formData.get("stageId") ?? ""),
    probability: String(formData.get("probability") ?? ""),
    expectedCloseDate: String(formData.get("expectedCloseDate") ?? ""),
    source: String(formData.get("source") ?? ""),
    ownerId: String(formData.get("ownerId") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    lostReason: String(formData.get("lostReason") ?? ""),
  });
  if (!result.ok) dealError(dealId, result.error ?? "Could not update deal.");
  redirect(`/admin/crm/deals/${dealId}?ok=${encodeURIComponent("Deal updated.")}`);
}

export async function crmDealStageForm(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const result = await changeDealStage(dealId, String(formData.get("stageId") ?? ""));
  const returnTo = safeCrmReturn(formData.get("returnTo"), `/admin/crm/deals/${dealId}`);
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not move deal.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent(result.message ?? "Deal moved.")}`);
}

export async function crmActivityForm(formData: FormData): Promise<void> {
  const result = await addCrmActivity({
    type: String(formData.get("type") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    occurredAt: String(formData.get("occurredAt") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    dealId: String(formData.get("dealId") ?? ""),
  });
  const fallback = formData.get("dealId")
    ? `/admin/crm/deals/${String(formData.get("dealId"))}`
    : "/admin/crm/activities";
  const returnTo = safeCrmReturn(formData.get("returnTo"), fallback);
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not log activity.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent("Activity logged.")}`);
}

export async function crmTaskForm(formData: FormData): Promise<void> {
  const result = await addCrmTask({
    text: String(formData.get("text") ?? ""),
    dueAt: String(formData.get("dueAt") ?? ""),
    priority: String(formData.get("priority") ?? ""),
    assigneeId: String(formData.get("assigneeId") ?? ""),
    leadId: String(formData.get("leadId") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    dealId: String(formData.get("dealId") ?? ""),
  });
  const fallback = formData.get("dealId")
    ? `/admin/crm/deals/${String(formData.get("dealId"))}`
    : "/admin/crm";
  const returnTo = safeCrmReturn(formData.get("returnTo"), fallback);
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not add task.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent("Task added.")}`);
}

export async function crmTaskToggleForm(formData: FormData): Promise<void> {
  const result = await toggleCrmTask(String(formData.get("taskId") ?? ""));
  const returnTo = safeCrmReturn(formData.get("returnTo"), "/admin/crm");
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not update task.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent(result.message ?? "Task updated.")}`);
}

export async function crmTaskDeleteForm(formData: FormData): Promise<void> {
  const result = await deleteCrmTask(String(formData.get("taskId") ?? ""));
  const returnTo = safeCrmReturn(formData.get("returnTo"), "/admin/crm");
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not delete task.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent("Task deleted.")}`);
}

export async function crmDealFromLeadForm(formData: FormData): Promise<void> {
  const leadId = String(formData.get("leadId") ?? "");
  const result = await createDealFromLead(leadId);
  if (!result.ok) redirect(`/admin/leads/${leadId}?error=${encodeURIComponent(result.error ?? "Could not create deal.")}`);
  if (!result.id) redirect(`/admin/leads/${leadId}?error=${encodeURIComponent("Could not create deal.")}`);
  redirect(`/admin/crm/deals/${result.id}?ok=${encodeURIComponent("Deal created from lead.")}`);
}

export async function crmDealFromClientForm(formData: FormData): Promise<void> {
  const clientId = String(formData.get("clientId") ?? "");
  const result = await createDealFromClient(clientId);
  if (!result.ok) redirect(`/admin/clients/${clientId}?error=${encodeURIComponent(result.error ?? "Could not create deal.")}`);
  if (!result.id) redirect(`/admin/clients/${clientId}?error=${encodeURIComponent("Could not create deal.")}`);
  redirect(`/admin/crm/deals/${result.id}?ok=${encodeURIComponent("Deal created from client.")}`);
}

export async function crmSettingsForm(formData: FormData): Promise<void> {
  const result = await updateCrmSettings({
    autoAssignLeads:
      formData.get("autoAssignLeads") === "on" || formData.get("autoAssignLeads") === "true",
    staleDealDays: Number(formData.get("staleDealDays") ?? 14),
    defaultCurrency: String(formData.get("defaultCurrency") ?? "USD"),
  });
  if (!result.ok) redirect(`/admin/crm/settings?error=${encodeURIComponent(result.error ?? "Could not save settings.")}`);
  redirect(`/admin/crm/settings?ok=${encodeURIComponent("CRM settings saved.")}`);
}

export async function crmStageUpdateForm(formData: FormData): Promise<void> {
  const result = await updateCrmStage(String(formData.get("stageId") ?? ""), {
    label: String(formData.get("label") ?? ""),
    probability: Number(formData.get("probability") ?? 0),
    order: Number(formData.get("order") ?? 0),
    isWon: formData.get("isWon") === "on",
    isLost: formData.get("isLost") === "on",
    active: formData.get("active") === "on",
  });
  if (!result.ok) redirect(`/admin/crm/settings?error=${encodeURIComponent(result.error ?? "Could not update stage.")}`);
  redirect(`/admin/crm/settings?ok=${encodeURIComponent("Stage updated.")}`);
}

export async function crmStageCreateForm(formData: FormData): Promise<void> {
  const result = await createCrmStage({
    label: String(formData.get("label") ?? ""),
    probability: Number(formData.get("probability") ?? 0),
    order: Number(formData.get("order") ?? 0),
    isWon: formData.get("isWon") === "on",
    isLost: formData.get("isLost") === "on",
  });
  if (!result.ok) redirect(`/admin/crm/settings?error=${encodeURIComponent(result.error ?? "Could not create stage.")}`);
  redirect(`/admin/crm/settings?ok=${encodeURIComponent("Stage created.")}`);
}

export async function crmRecalculateScoresForm(): Promise<void> {
  const result = await recalculateScores();
  if (!result.ok) redirect(`/admin/crm/settings?error=${encodeURIComponent(result.error ?? "Could not recalculate scores.")}`);
  redirect(`/admin/crm/settings?ok=${encodeURIComponent(result.message ?? "Scores recalculated.")}`);
}

export async function crmDealDeleteForm(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const result = await deleteDeal(dealId);
  if (!result.ok) redirect(`/admin/crm/deals/${dealId}?error=${encodeURIComponent(result.error ?? "Could not delete deal.")}`);
  redirect(`/admin/crm/deals?ok=${encodeURIComponent("Deal deleted.")}`);
}

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
import { ensureCrmPipelines } from "./pipelines";
import { mergeDealTemplateDefaults, normalizeDealTemplateDefaults } from "./deal-template-helpers";
import { saveCrmSettings } from "./settings";
import { recalculateLeadScores, updateLeadScore } from "./scoring";
import {
  clientAccessWhere,
  dealAccessWhere,
  getCrmAccessForUser,
  leadAccessWhere,
  taskAccessWhere,
  type CrmAccess,
} from "./access";
import { notifyCrmUser } from "./notifications";
import { mergeClients, mergeLeads } from "./merge";
import { deleteCrmFile } from "@/lib/crm-storage";
import { reportCrmIssue } from "@/lib/monitoring";
import { sendCrmEmail, syncUserCrmEmailConnections } from "./oauth-sync";
import { runCrmWorkflows } from "./workflow-runner";
import {
  generateTrackingToken,
  isEmailSuppressed,
  prepareTrackedEmail,
  recordEmailEvent,
  recordEmailFailure,
} from "./email-tracking";

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

function resolveRecordSource(input: {
  intake?: Prisma.JsonValue | null;
  publisherId?: string | null;
  campaignId?: string | null;
  fallback: string;
}): string {
  const intake = input.intake;
  if (intake && typeof intake === "object" && !Array.isArray(intake)) {
    const raw = (intake as Record<string, unknown>).source;
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  if (input.publisherId) return `publisher:${input.publisherId}`;
  if (input.campaignId) return `campaign:${input.campaignId}`;
  return input.fallback;
}

function safeCrmReturn(value: FormDataEntryValue | null, fallback: string): string {
  const raw = String(value ?? "");
  return raw.startsWith("/admin/crm") ||
    raw.startsWith("/admin/leads/") ||
    raw.startsWith("/admin/clients/")
    ? raw
    : fallback;
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
  revalidatePath("/admin/crm/reports");
  revalidatePath("/admin/crm/reports/forecasting");
  if (dealId) revalidatePath(`/admin/crm/deals/${dealId}`);
}

async function crmActor(): Promise<{ user: Awaited<ReturnType<typeof requireSection>>; access: CrmAccess }> {
  const user = await requireSection("crm");
  return { user, access: await getCrmAccessForUser(user) };
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

async function validateStage(stageId: string, pipelineId?: string) {
  const stage = await prisma.crmStage.findFirst({
    where: {
      id: stageId,
      tenantId: TENANT_ID,
      active: true,
      ...(pipelineId ? { pipelineId } : {}),
    },
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

async function validateLead(leadId: string | null, access?: CrmAccess) {
  if (!leadId) return true;
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: TENANT_ID, ...leadAccessWhere(access) },
    select: { id: true },
  });
  return Boolean(lead);
}

async function validateClient(clientId: string | null, access?: CrmAccess) {
  if (!clientId) return true;
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: TENANT_ID, ...clientAccessWhere(access) },
    select: { id: true },
  });
  return Boolean(client);
}

async function validateDeal(dealId: string | null, access?: CrmAccess) {
  if (!dealId) return true;
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID, ...dealAccessWhere(access) },
    select: { id: true },
  });
  return Boolean(deal);
}

export async function createDeal(input: {
  title: string;
  value?: string;
  currency?: string;
  stageId?: string;
  pipelineId?: string;
  templateId?: string;
  probability?: string;
  expectedCloseDate?: string;
  source?: string;
  ownerId?: string;
  leadId?: string;
  clientId?: string;
  lineItemsJson?: string;
  companyName?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const templateId = input.templateId?.trim() || null;
  const template = templateId
    ? await prisma.crmDealTemplate.findFirst({
      where: { id: templateId, tenantId: TENANT_ID, active: true },
      select: { id: true, defaults: true },
    })
    : null;
  if (templateId && !template) return { ok: false, error: "Deal template not found." };
  const templateDefaults = template ? normalizeDealTemplateDefaults(template.defaults) : null;

  const rawValue = input.value?.trim() ?? "";
  const parsedValue = rawValue ? parseMoney(rawValue) : null;
  if (parsedValue === null) return { ok: false, error: "Deal value must be a positive number." };
  const rawProbability = input.probability?.trim() ?? "";
  const parsedProbability = rawProbability ? parseOptionalInt(rawProbability) : null;
  if (parsedProbability === "invalid") {
    return { ok: false, error: "Probability must be a whole number between 0 and 100." };
  }
  const parsedExpectedCloseDate = parseDate(input.expectedCloseDate ?? "");
  if (parsedExpectedCloseDate === "invalid") {
    return { ok: false, error: "Invalid expected close date." };
  }

  const rawLineItemsJson = input.lineItemsJson?.trim();
  const parsedLineItems = (() => {
    if (!rawLineItemsJson) return undefined;
    try {
      const parsed: unknown = JSON.parse(rawLineItemsJson);
      if (!Array.isArray(parsed)) return "invalid" as const;
      return normalizeDealTemplateDefaults({ lineItems: parsed }).lineItems;
    } catch {
      return "invalid" as const;
    }
  })();
  if (parsedLineItems === "invalid") {
    return { ok: false, error: "Template line items are invalid." };
  }

  const merged = templateDefaults
    ? mergeDealTemplateDefaults(templateDefaults, {
      title: input.title?.trim() || "",
      value: rawValue ? parsedValue : undefined,
      currency: input.currency?.trim() || "",
      probability: rawProbability ? parsedProbability : undefined,
      expectedCloseDate: input.expectedCloseDate?.trim() || "",
      source: input.source?.trim() || "",
      companyName: input.companyName?.trim() || "",
      contactName: input.contactName?.trim() || "",
      contactEmail: input.contactEmail?.trim() || "",
      contactPhone: input.contactPhone?.trim() || "",
      notes: input.notes?.trim() || "",
      lineItems: parsedLineItems,
    })
    : null;

  const title = merged?.title || input.title?.trim() || "";
  if (!title) return { ok: false, error: "Deal title is required." };
  const value = merged?.value ?? parsedValue ?? 0;
  const probability = merged?.probability ?? (rawProbability ? parsedProbability : null);
  const expectedCloseDate = merged?.expectedCloseDate
    ? parseDate(merged.expectedCloseDate)
    : parsedExpectedCloseDate;
  if (expectedCloseDate === "invalid") return { ok: false, error: "Invalid expected close date." };
  const lineItems = merged?.lineItems ?? [];

  const requestedPipelineId = input.pipelineId?.trim() || null;
  const explicitStageId = input.stageId?.trim();
  let stage = explicitStageId
    ? await validateStage(explicitStageId, requestedPipelineId ?? undefined)
    : null;
  if (explicitStageId && !stage) return { ok: false, error: "Pipeline stage not found." };
  if (!stage && templateDefaults?.stageKey) {
    const candidates = await getCrmStages(requestedPipelineId ?? undefined);
    stage = candidates.find(
      (candidate) => candidate.key.toLowerCase() === templateDefaults?.stageKey.toLowerCase(),
    ) ?? null;
  }
  stage ??= await getDefaultCrmStage(requestedPipelineId ?? undefined);
  if (!stage) return { ok: false, error: "No pipeline stage is available." };

  const pipelineId = requestedPipelineId || stage.pipelineId || (await ensureCrmPipelines()).id;
  if (stage.pipelineId !== pipelineId) {
    return { ok: false, error: "That stage belongs to a different pipeline." };
  }

  let ownerId = input.ownerId?.trim() || null;
  if (!access.isAdmin) {
    ownerId = ownerId || access.userId;
    if (ownerId !== access.userId) {
      return { ok: false, error: "You can only assign deals to yourself." };
    }
  }
  if (!(await validateOwner(ownerId))) return { ok: false, error: "Owner not found." };
  const leadId = input.leadId?.trim() || null;
  if (!(await validateLead(leadId, access))) return { ok: false, error: "Linked lead not found." };
  const clientId = input.clientId?.trim() || null;
  if (!(await validateClient(clientId, access))) return { ok: false, error: "Linked client not found." };

  const deal = await prisma.$transaction(async (tx) => {
    const row = await tx.deal.create({
      data: {
        tenantId: TENANT_ID,
        title,
        value: new Prisma.Decimal(value.toFixed(2)),
        currency: merged?.currency || input.currency?.trim().toUpperCase().slice(0, 3) || "USD",
        stageId: stage.id,
        pipelineId,
        templateId,
        probability,
        expectedCloseDate,
        source: merged?.source || input.source?.trim() || null,
        ownerId,
        leadId,
        clientId,
        companyName: merged?.companyName || input.companyName?.trim() || null,
        contactName: merged?.contactName || input.contactName?.trim() || null,
        contactEmail: merged?.contactEmail || input.contactEmail?.trim() || null,
        contactPhone: merged?.contactPhone || input.contactPhone?.trim() || null,
        notes: merged?.notes || input.notes?.trim() || null,
        lastActivityAt: new Date(),
      },
    });
    if (lineItems.length > 0) {
      await tx.dealLineItem.createMany({
        data: lineItems.map((item, index) => ({
          dealId: row.id,
          description: item.name,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice.toFixed(2)),
          order: index,
        })),
      });
    }
    await logCrmActivity({
      type: "SYSTEM",
      subject: "Deal created",
      body: `${title} created in ${stage.label}.`,
      userId: user.id,
      leadId,
      clientId,
      dealId: row.id,
      metadata: { stageId: stage.id },
      client: tx,
    });
    return row;
  });

  if (ownerId && ownerId !== user.id) {
    await notifyCrmUser({
      userId: ownerId,
      type: "DEAL_ASSIGNED",
      title: "New deal assigned",
      body: title,
      link: `/admin/crm/deals/${deal.id}`,
    }).catch(() => null);
  }
  await logAudit({
    action: "DEAL_CREATE",
    entity: "Deal",
    entityId: deal.id,
    actorId: user.id,
    reason: `Deal "${title}" created`,
    meta: { value, stageId: stage.id, ownerId, leadId, clientId },
  });
  revalidateEntity({ leadId, clientId, dealId: deal.id });
  await runCrmWorkflows("deal.created", {
    dealId: deal.id,
    title: deal.title,
    value: Number(deal.value),
    stageId: deal.stageId,
    stageLabel: stage.label,
    leadId,
    clientId,
    ownerId,
    source: deal.source,
    userId: user.id,
  }).catch((error) => reportCrmIssue("error", "crm.workflow.dealCreated", error));
  return { ok: true, message: "Deal created.", id: deal.id };
}

export async function updateDeal(
  dealId: string,
  input: {
    title?: string;
    value?: string;
    currency?: string;
    stageId?: string;
    pipelineId?: string;
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
  const { user, access } = await crmActor();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID, ...dealAccessWhere(access) },
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
    const requestedPipelineId = input.pipelineId?.trim() || undefined;
    const stage = await validateStage(input.stageId, requestedPipelineId);
    if (!stage) return { ok: false, error: "Pipeline stage not found." };
    nextStage = stage;
    data.stage = { connect: { id: stage.id } };
    data.pipeline = stage.pipelineId
      ? { connect: { id: stage.pipelineId } }
      : { disconnect: true };
  }
  if (input.ownerId !== undefined) {
    const ownerId = input.ownerId.trim() || null;
    if (!access.isAdmin && ownerId && ownerId !== access.userId) {
      return { ok: false, error: "You can only assign deals to yourself." };
    }
    if (!(await validateOwner(ownerId))) return { ok: false, error: "Owner not found." };
    data.ownerId = ownerId;
  }
  if (input.leadId !== undefined) {
    const leadId = input.leadId.trim() || null;
    if (!(await validateLead(leadId, access))) return { ok: false, error: "Linked lead not found." };
    data.lead = leadId ? { connect: { id: leadId } } : { disconnect: true };
  }
  if (input.clientId !== undefined) {
    const clientId = input.clientId.trim() || null;
    if (!(await validateClient(clientId, access))) return { ok: false, error: "Linked client not found." };
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

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.deal.update({ where: { id: dealId }, data });
    if (stageChanged) {
      await logCrmActivity({
        type: "STAGE_CHANGE",
        subject: `${deal.stage.label} → ${nextStage.label}`,
        body: input.lostReason?.trim() || null,
        userId: user.id,
        leadId: row.leadId,
        clientId: row.clientId,
        dealId: row.id,
        metadata: { from: deal.stageId, to: nextStage.id },
        client: tx,
      });
    }
    return row;
  });

  if (updated.ownerId && updated.ownerId !== user.id && updated.ownerId !== deal.ownerId) {
    await notifyCrmUser({
      userId: updated.ownerId,
      type: "DEAL_ASSIGNED",
      title: "Deal assigned to you",
      body: updated.title,
      link: `/admin/crm/deals/${updated.id}`,
    }).catch(() => null);
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
  await runCrmWorkflows(stageChanged ? "deal.stage_changed" : "deal.updated", {
    dealId: updated.id,
    title: updated.title,
    value: Number(updated.value),
    stageId: nextStage.id,
    stageLabel: nextStage.label,
    previousStageId: deal.stageId,
    previousStageLabel: deal.stage.label,
    leadId: updated.leadId,
    clientId: updated.clientId,
    ownerId: updated.ownerId,
    source: updated.source,
    userId: user.id,
  }).catch((error) => reportCrmIssue("error", "crm.workflow.dealUpdated", error));
  return { ok: true, message: "Deal updated.", id: updated.id };
}

export async function changeDealStage(
  dealId: string,
  stageId: string,
  pipelineId?: string,
): Promise<CrmActionResult> {
  return updateDeal(dealId, { stageId, pipelineId });
}

export async function deleteDeal(dealId: string): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID, ...dealAccessWhere(access) },
  });
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
  const { user, access } = await crmActor();
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
  if (!(await validateLead(leadId, access))) return { ok: false, error: "Lead not found." };
  if (!(await validateClient(clientId, access))) return { ok: false, error: "Client not found." };
  if (!(await validateDeal(dealId, access))) return { ok: false, error: "Deal not found." };

  let occurredAt: Date | undefined;
  if (input.occurredAt?.trim()) {
    const date = new Date(input.occurredAt);
    if (Number.isNaN(date.getTime())) return { ok: false, error: "Invalid activity date." };
    occurredAt = date;
  }

  const activity = await prisma.$transaction(async (tx) =>
    logCrmActivity({
      type: input.type as CrmActivityType,
      subject: subject || null,
      body: body || null,
      occurredAt,
      userId: user.id,
      leadId,
      clientId,
      dealId,
      client: tx,
    }),
  );
  await logAudit({
    action: "CRM_ACTIVITY_ADD",
    entity: "CrmActivity",
    entityId: activity.id,
    actorId: user.id,
    reason: `${input.type} activity logged`,
    meta: { leadId, clientId, dealId },
  });
  revalidateEntity({ leadId, clientId, dealId });
  await runCrmWorkflows("activity.created", {
    activityId: activity.id,
    activityType: input.type,
    subject: subject || null,
    leadId,
    clientId,
    dealId,
    userId: user.id,
  }).catch((error) => reportCrmIssue("error", "crm.workflow.activityCreated", error));
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
  const { user, access } = await crmActor();
  const text = input.text.trim();
  if (!text) return { ok: false, error: "Task text is required." };
  const leadId = input.leadId?.trim() || null;
  const clientId = input.clientId?.trim() || null;
  const dealId = input.dealId?.trim() || null;
  if (!leadId && !clientId && !dealId) {
    return { ok: false, error: "Link the task to a lead, client, or deal." };
  }
  if (!(await validateLead(leadId, access))) return { ok: false, error: "Lead not found." };
  if (!(await validateClient(clientId, access))) return { ok: false, error: "Client not found." };
  if (!(await validateDeal(dealId, access))) return { ok: false, error: "Deal not found." };
  const priority = (input.priority ?? "NORMAL").toUpperCase();
  if (!(CRM_TASK_PRIORITIES as readonly string[]).includes(priority)) {
    return { ok: false, error: "Unknown task priority." };
  }
  let dueAt: Date | null = null;
  if (input.dueAt?.trim()) {
    dueAt = new Date(input.dueAt);
    if (Number.isNaN(dueAt.getTime())) return { ok: false, error: "Invalid task due date." };
  }
  const assigneeId = input.assigneeId?.trim() || (access.isAdmin ? null : access.userId);
  if (!access.isAdmin && assigneeId && assigneeId !== access.userId) {
    return { ok: false, error: "You can only assign tasks to yourself." };
  }
  if (!(await validateOwner(assigneeId))) return { ok: false, error: "Assignee not found." };

  const task = await prisma.$transaction(async (tx) => {
    const row = await tx.toDo.create({
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
      metadata: { taskId: row.id, priority },
      client: tx,
    });
    return row;
  });
  if (assigneeId && assigneeId !== user.id) {
    await notifyCrmUser({
      userId: assigneeId,
      type: "TASK_ASSIGNED",
      title: "New CRM task assigned",
      body: text,
      link: dealId ? `/admin/crm/deals/${dealId}` : leadId ? `/admin/leads/${leadId}` : clientId ? `/admin/clients/${clientId}` : "/admin/crm",
    }).catch(() => null);
  }
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
  const { user, access } = await crmActor();
  const task = await prisma.toDo.findFirst({
    where: {
      id: taskId,
      AND: [
        {
          OR: [
            { lead: { tenantId: TENANT_ID } },
            { client: { tenantId: TENANT_ID } },
            { deal: { tenantId: TENANT_ID } },
          ],
        },
        taskAccessWhere(access),
      ],
    },
  });
  if (!task) return { ok: false, error: "Task not found." };
  const nowFinished = task.finishedAt === null;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.toDo.update({
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
      client: tx,
    });
    return row;
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
  const { user, access } = await crmActor();
  const task = await prisma.toDo.findFirst({
    where: {
      id: taskId,
      AND: [
        {
          OR: [
            { lead: { tenantId: TENANT_ID } },
            { client: { tenantId: TENANT_ID } },
            { deal: { tenantId: TENANT_ID } },
          ],
        },
        taskAccessWhere(access),
      ],
    },
  });
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
  const { user, access } = await crmActor();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: TENANT_ID, ...leadAccessWhere(access) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phones: true,
      assignedToId: true,
      intake: true,
      publisherId: true,
      campaignId: true,
    },
  });
  if (!lead) return { ok: false, error: "Lead not found." };
  const stage = await getDefaultCrmStage();
  if (!stage) return { ok: false, error: "No pipeline stage is available." };
  const phones = Array.isArray(lead.phones)
    ? (lead.phones as { number?: string }[])
    : [];
  const name = `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.email || "Lead";
  const deal = await prisma.$transaction(async (tx) => {
    const row = await tx.deal.create({
      data: {
        tenantId: TENANT_ID,
        title: name,
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        value: new Prisma.Decimal(0),
        ownerId: access.isAdmin ? lead.assignedToId : access.userId,
        leadId: lead.id,
        contactName: name,
        contactEmail: lead.email,
        contactPhone: phones.find((phone) => phone.number)?.number ?? null,
        source: resolveRecordSource({
          intake: lead.intake,
          publisherId: lead.publisherId,
          campaignId: lead.campaignId,
          fallback: "Lead",
        }),
        lastActivityAt: new Date(),
      },
    });
    await logCrmActivity({
      type: "SYSTEM",
      subject: "Deal created from lead",
      body: `${name} moved into the pipeline.`,
      userId: user.id,
      leadId: lead.id,
      dealId: row.id,
      client: tx,
    });
    return row;
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
  const { user, access } = await crmActor();
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: TENANT_ID, ...clientAccessWhere(access) },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phones: true,
      assignedToId: true,
      publisherId: true,
      campaignId: true,
    },
  });
  if (!client) return { ok: false, error: "Client not found." };
  const stage = await getDefaultCrmStage();
  if (!stage) return { ok: false, error: "No pipeline stage is available." };
  const phones = Array.isArray(client.phones)
    ? (client.phones as { number?: string }[])
    : [];
  const name = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || client.email || "Client";
  const deal = await prisma.$transaction(async (tx) => {
    const row = await tx.deal.create({
      data: {
        tenantId: TENANT_ID,
        title: name,
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        value: new Prisma.Decimal(0),
        ownerId: access.isAdmin ? client.assignedToId : access.userId,
        clientId: client.id,
        contactName: name,
        contactEmail: client.email,
        contactPhone: phones.find((phone) => phone.number)?.number ?? null,
        source: resolveRecordSource({
          publisherId: client.publisherId,
          campaignId: client.campaignId,
          fallback: "Client",
        }),
        lastActivityAt: new Date(),
      },
    });
    await logCrmActivity({
      type: "SYSTEM",
      subject: "Deal created from client",
      body: `${name} added to the pipeline.`,
      userId: user.id,
      clientId: client.id,
      dealId: row.id,
      client: tx,
    });
    return row;
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
  const { user, access } = await crmActor();
  if (!access.isAdmin) return { ok: false, error: "Only admins can edit pipeline stages." };
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
  const { user, access } = await crmActor();
  if (!access.isAdmin) return { ok: false, error: "Only admins can create pipeline stages." };
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
  const pipeline = await ensureCrmPipelines();
  const stage = await prisma.crmStage.create({
    data: {
      tenantId: TENANT_ID,
      pipelineId: pipeline.id,
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
  restrictSalesRepsToOwned?: boolean;
  staleDealDays?: number;
  defaultCurrency?: string;
}): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  if (!access.isAdmin) return { ok: false, error: "Only admins can change CRM settings." };
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
  const { user, access } = await crmActor();
  if (!access.isAdmin) return { ok: false, error: "Only admins can recalculate all lead scores." };
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
    pipelineId: String(formData.get("pipelineId") ?? ""),
    templateId: String(formData.get("templateId") ?? ""),
    lineItemsJson: String(formData.get("lineItemsJson") ?? ""),
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

export async function crmDealEmailForm(formData: FormData): Promise<void> {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const dealId = String(formData.get("dealId") ?? "");
  const returnTo = safeCrmReturn(formData.get("returnTo"), `/admin/crm/deals/${dealId}`);
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID, ...dealAccessWhere(access) },
    select: {
      id: true,
      contactEmail: true,
      contactName: true,
      leadId: true,
      clientId: true,
    },
  });
  if (!deal) redirect(`${returnTo}?error=${encodeURIComponent("Deal not found.")}`);

  const connectionId = String(formData.get("connectionId") ?? "").trim();
  const to = String(formData.get("toEmail") ?? deal.contactEmail ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!connectionId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject || !body) {
    redirect(`${returnTo}?error=${encodeURIComponent("Mailbox, recipient, subject, and body are required.")}`);
  }

  if (await isEmailSuppressed(to)) {
    redirect(
      `${returnTo}?error=${encodeURIComponent("This recipient has unsubscribed from CRM email.")}`,
    );
  }

  const trackingToken = generateTrackingToken();
  const tracked = prepareTrackedEmail({ body, htmlBody: null, token: trackingToken });
  const headers = {
    "List-Unsubscribe": `<${tracked.unsubscribeUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
  const messageRow = await prisma.crmEmailMessage.create({
    data: {
      tenantId: TENANT_ID,
      connectionId,
      dealId: deal.id,
      leadId: deal.leadId,
      clientId: deal.clientId,
      toEmail: to,
      subject,
      body: tracked.body,
      bodyHtml: tracked.htmlBody,
      trackingToken,
      trackingEnabled: true,
      status: "QUEUED",
    },
  });

  let errorMessage: string | null = null;
  try {
    const sent = await sendCrmEmail({
      connectionId,
      userId: access.isAdmin ? undefined : user.id,
      to,
      subject,
      body: tracked.body,
      htmlBody: tracked.htmlBody,
      headers,
    });
    const sentAt = new Date();
    await prisma.crmEmailMessage.update({
      where: { id: messageRow.id },
      data: { status: "SENT", providerMessageId: sent.providerMessageId, sentAt },
    });
    await recordEmailEvent({
      messageId: messageRow.id,
      type: "SENT",
      occurredAt: sentAt,
      providerEventId: sent.providerMessageId ?? `sent:${messageRow.id}`,
      recipient: to,
      provider: sent.providerMessageId ? "mailbox" : null,
    });
    await logCrmActivity({
      type: "EMAIL",
      subject,
      body,
      userId: user.id,
      dealId: deal.id,
      leadId: deal.leadId,
      clientId: deal.clientId,
      source: "manual",
      metadata: {
        to,
        from: sent.fromEmail,
        messageId: messageRow.id,
        trackingEnabled: true,
      },
    });
    await logAudit({
      action: "CRM_EMAIL_SEND",
      entity: "Deal",
      entityId: deal.id,
      actorId: user.id,
      reason: `Email sent to ${to}`,
      meta: { subject, providerMessageId: sent.providerMessageId, messageId: messageRow.id },
    });
    revalidateEntity({ dealId: deal.id, leadId: deal.leadId, clientId: deal.clientId });
  } catch (error) {
    await reportCrmIssue("error", "crm.email.send", error);
    const messageText = error instanceof Error ? error.message : "Could not send email.";
    await recordEmailFailure({
      messageId: messageRow.id,
      recipient: to,
      failureCode: "SEND_FAILED",
      metadata: { error: messageText.slice(0, 500) },
    }).catch(() => null);
    errorMessage = messageText;
  }
  if (errorMessage) {
    redirect(`${returnTo}?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(`${returnTo}?ok=${encodeURIComponent("Email sent.")}`);
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
    restrictSalesRepsToOwned:
      formData.get("restrictSalesRepsToOwned") === "on" ||
      formData.get("restrictSalesRepsToOwned") === "true",
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

// ---------------------------------------------------------------------------
// Duplicate merge
// ---------------------------------------------------------------------------

export async function mergeLeadRecords(
  sourceId: string,
  targetId: string,
): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const [source, target] = await Promise.all([
    prisma.lead.findFirst({ where: { id: sourceId, tenantId: TENANT_ID, ...leadAccessWhere(access) } }),
    prisma.lead.findFirst({ where: { id: targetId, tenantId: TENANT_ID, ...leadAccessWhere(access) } }),
  ]);
  if (!source || !target) return { ok: false, error: "Lead not found." };
  const result = await mergeLeads(sourceId, targetId, user.id);
  if (!result.ok) return { ok: false, error: result.error };
  await logAudit({
    action: "LEAD_MERGE",
    entity: "Lead",
    entityId: targetId,
    actorId: user.id,
    reason: `Lead ${sourceId} merged into ${targetId}`,
    meta: result.moved ?? {},
  });
  revalidateEntity({ leadId: targetId });
  revalidatePath("/admin/leads");
  return { ok: true, message: "Leads merged.", id: targetId };
}

export async function mergeClientRecords(
  sourceId: string,
  targetId: string,
): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const [source, target] = await Promise.all([
    prisma.client.findFirst({ where: { id: sourceId, tenantId: TENANT_ID, ...clientAccessWhere(access) } }),
    prisma.client.findFirst({ where: { id: targetId, tenantId: TENANT_ID, ...clientAccessWhere(access) } }),
  ]);
  if (!source || !target) return { ok: false, error: "Client not found." };
  const result = await mergeClients(sourceId, targetId, user.id);
  if (!result.ok) return { ok: false, error: result.error };
  await logAudit({
    action: "CLIENT_MERGE",
    entity: "Client",
    entityId: targetId,
    actorId: user.id,
    reason: `Client ${sourceId} merged into ${targetId}`,
    meta: result.moved ?? {},
  });
  revalidateEntity({ clientId: targetId });
  revalidatePath("/admin/clients");
  return { ok: true, message: "Clients merged.", id: targetId };
}

// ---------------------------------------------------------------------------
// Bulk deal actions
// ---------------------------------------------------------------------------

export async function bulkDealAction(input: {
  dealIds: string[];
  action: "stage" | "owner" | "delete";
  stageId?: string;
  ownerId?: string;
}): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const ids = [...new Set(input.dealIds.filter(Boolean))].slice(0, 200);
  if (ids.length === 0) return { ok: false, error: "Select at least one deal." };
  const deals = await prisma.deal.findMany({
    where: { id: { in: ids }, tenantId: TENANT_ID, ...dealAccessWhere(access) },
    include: { stage: true },
  });
  if (deals.length === 0) return { ok: false, error: "No accessible deals selected." };

  if (input.action === "delete") {
    await prisma.$transaction(async (tx) => {
      for (const deal of deals) await tx.deal.delete({ where: { id: deal.id } });
    });
    await logAudit({
      action: "DEAL_BULK_DELETE",
      entity: "Deal",
      entityId: deals[0].id,
      actorId: user.id,
      reason: `Bulk deleted ${deals.length} deal(s)`,
      meta: { ids: deals.map((deal) => deal.id) },
    });
    revalidateCrm();
    return { ok: true, message: `${deals.length} deal(s) deleted.` };
  }

  if (input.action === "stage") {
    const stage = await validateStage(input.stageId?.trim() ?? "");
    if (!stage) return { ok: false, error: "Pipeline stage not found." };
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const deal of deals) {
        const stageChanged = deal.stageId !== stage.id;
        await tx.deal.update({
          where: { id: deal.id },
          data: {
            stageId: stage.id,
            pipelineId: stage.pipelineId,
            ...(stageChanged
              ? {
                  stageChangedAt: now,
                  lastActivityAt: now,
                  wonAt: stage.isWon ? now : null,
                  closedAt: stage.isWon || stage.isLost ? now : null,
                  lostReason: stage.isLost ? deal.lostReason : null,
                }
              : {}),
          },
        });
        if (stageChanged) {
          await logCrmActivity({
            type: "STAGE_CHANGE",
            subject: `${deal.stage.label} → ${stage.label}`,
            body: "Bulk stage update.",
            userId: user.id,
            leadId: deal.leadId,
            clientId: deal.clientId,
            dealId: deal.id,
            metadata: { from: deal.stageId, to: stage.id, bulk: true },
            client: tx,
          });
        }
      }
    });
    await logAudit({
      action: "DEAL_BULK_UPDATE",
      entity: "Deal",
      entityId: deals[0].id,
      actorId: user.id,
      reason: `Bulk moved ${deals.length} deal(s) to ${stage.label}`,
      meta: { ids: deals.map((deal) => deal.id), stageId: stage.id },
    });
    revalidateCrm();
    return { ok: true, message: `${deals.length} deal(s) moved to ${stage.label}.` };
  }

  const ownerId = input.ownerId?.trim() || null;
  if (!access.isAdmin && ownerId && ownerId !== access.userId) {
    return { ok: false, error: "You can only assign deals to yourself." };
  }
  if (!(await validateOwner(ownerId))) return { ok: false, error: "Owner not found." };
  await prisma.deal.updateMany({
    where: { id: { in: deals.map((deal) => deal.id) } },
    data: { ownerId },
  });
  await logAudit({
    action: "DEAL_BULK_UPDATE",
    entity: "Deal",
    entityId: deals[0].id,
    actorId: user.id,
    reason: `Bulk reassigned ${deals.length} deal(s)`,
    meta: { ids: deals.map((deal) => deal.id), ownerId },
  });
  revalidateCrm();
  return { ok: true, message: `${deals.length} deal(s) reassigned.` };
}

// ---------------------------------------------------------------------------
// Deal line items and product catalog
// ---------------------------------------------------------------------------

async function syncDealValue(tx: Prisma.TransactionClient, dealId: string): Promise<void> {
  const items = await tx.dealLineItem.findMany({
    where: { dealId },
    select: { quantity: true, unitPrice: true },
  });
  const total = items.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0);
  await tx.deal.update({
    where: { id: dealId },
    data: { value: new Prisma.Decimal(total.toFixed(2)) },
  });
}

export async function addDealLineItem(
  dealId: string,
  input: { description: string; quantity?: string; unitPrice?: string; productId?: string },
): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId: TENANT_ID, ...dealAccessWhere(access) },
  });
  if (!deal) return { ok: false, error: "Deal not found." };
  const description = input.description.trim();
  if (!description) return { ok: false, error: "Line item description is required." };
  const quantity = Number.parseInt(input.quantity ?? "1", 10);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
    return { ok: false, error: "Quantity must be a whole number between 1 and 100000." };
  }
  const unitPrice = parseMoney(input.unitPrice ?? "0");
  if (unitPrice === null) return { ok: false, error: "Unit price must be a positive number." };
  const productId = input.productId?.trim() || null;
  if (productId) {
    const product = await prisma.crmProduct.findFirst({
      where: { id: productId, tenantId: TENANT_ID, active: true },
    });
    if (!product) return { ok: false, error: "Product not found." };
  }
  const item = await prisma.$transaction(async (tx) => {
    const row = await tx.dealLineItem.create({
      data: {
        dealId,
        productId,
        description,
        quantity,
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
      },
    });
    await syncDealValue(tx, dealId);
    return row;
  });
  await logAudit({
    action: "CRM_LINE_ITEM_ADD",
    entity: "DealLineItem",
    entityId: item.id,
    actorId: user.id,
    reason: `Line item "${description}" added`,
    meta: { dealId, quantity, unitPrice },
  });
  revalidateCrm(dealId);
  return { ok: true, message: "Line item added.", id: item.id };
}

export async function updateDealLineItem(
  itemId: string,
  input: { description?: string; quantity?: string; unitPrice?: string },
): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const item = await prisma.dealLineItem.findFirst({
    where: { id: itemId, deal: { tenantId: TENANT_ID, ...dealAccessWhere(access) } },
  });
  if (!item) return { ok: false, error: "Line item not found." };
  const description = input.description?.trim() || item.description;
  if (!description) return { ok: false, error: "Line item description is required." };
  const quantity =
    input.quantity === undefined ? item.quantity : Number.parseInt(input.quantity, 10);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100_000) {
    return { ok: false, error: "Quantity must be a whole number between 1 and 100000." };
  }
  const unitPrice = input.unitPrice === undefined ? Number(item.unitPrice) : parseMoney(input.unitPrice);
  if (unitPrice === null) return { ok: false, error: "Unit price must be a positive number." };
  await prisma.$transaction(async (tx) => {
    await tx.dealLineItem.update({
      where: { id: itemId },
      data: { description, quantity, unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)) },
    });
    await syncDealValue(tx, item.dealId);
  });
  await logAudit({
    action: "CRM_LINE_ITEM_UPDATE",
    entity: "DealLineItem",
    entityId: itemId,
    actorId: user.id,
    reason: `Line item "${description}" updated`,
    meta: { dealId: item.dealId, quantity, unitPrice },
  });
  revalidateCrm(item.dealId);
  return { ok: true, message: "Line item updated.", id: itemId };
}

export async function deleteDealLineItem(itemId: string): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const item = await prisma.dealLineItem.findFirst({
    where: { id: itemId, deal: { tenantId: TENANT_ID, ...dealAccessWhere(access) } },
  });
  if (!item) return { ok: false, error: "Line item not found." };
  await prisma.$transaction(async (tx) => {
    await tx.dealLineItem.delete({ where: { id: itemId } });
    await syncDealValue(tx, item.dealId);
  });
  await logAudit({
    action: "CRM_LINE_ITEM_DELETE",
    entity: "DealLineItem",
    entityId: itemId,
    actorId: user.id,
    reason: `Line item "${item.description}" deleted`,
    meta: { dealId: item.dealId },
  });
  revalidateCrm(item.dealId);
  return { ok: true, message: "Line item deleted." };
}

export async function createCrmProduct(input: {
  name: string;
  sku?: string;
  description?: string;
  unitPrice?: string;
  currency?: string;
}): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  if (!access.isAdmin) return { ok: false, error: "Only admins can manage the product catalog." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Product name is required." };
  const unitPrice = parseMoney(input.unitPrice ?? "0");
  if (unitPrice === null) return { ok: false, error: "Unit price must be a positive number." };
  try {
    const product = await prisma.crmProduct.create({
      data: {
        tenantId: TENANT_ID,
        name,
        sku: input.sku?.trim() || null,
        description: input.description?.trim() || null,
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
        currency: input.currency?.trim().toUpperCase().slice(0, 3) || "USD",
      },
    });
    await logAudit({
      action: "CRM_PRODUCT_CREATE",
      entity: "CrmProduct",
      entityId: product.id,
      actorId: user.id,
      reason: `Product "${name}" created`,
    });
    revalidateCrm();
    return { ok: true, message: "Product created.", id: product.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "That SKU is already in use." };
    }
    throw error;
  }
}

export async function deleteCrmProduct(productId: string): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  if (!access.isAdmin) return { ok: false, error: "Only admins can manage the product catalog." };
  const product = await prisma.crmProduct.findFirst({
    where: { id: productId, tenantId: TENANT_ID },
  });
  if (!product) return { ok: false, error: "Product not found." };
  await prisma.crmProduct.delete({ where: { id: productId } });
  await logAudit({
    action: "CRM_PRODUCT_DELETE",
    entity: "CrmProduct",
    entityId: productId,
    actorId: user.id,
    reason: `Product "${product.name}" deleted`,
  });
  revalidateCrm();
  return { ok: true, message: "Product deleted." };
}

// ---------------------------------------------------------------------------
// Attachments and notifications
// ---------------------------------------------------------------------------

export async function deleteCrmAttachment(attachmentId: string): Promise<CrmActionResult> {
  const { user, access } = await crmActor();
  const attachment = await prisma.crmAttachment.findFirst({
    where: {
      id: attachmentId,
      tenantId: TENANT_ID,
      ...(access.ownedOnly
        ? {
            OR: [
              { deal: { ownerId: access.userId } },
              { lead: { assignedToId: access.userId } },
              { client: { assignedToId: access.userId } },
            ],
          }
        : {}),
    },
  });
  if (!attachment) return { ok: false, error: "Attachment not found." };
  await prisma.$transaction(async (tx) => {
    await tx.crmAttachment.delete({ where: { id: attachmentId } });
    if (attachment.assetId) {
      await tx.asset.delete({ where: { id: attachment.assetId } });
    }
  });
  if (attachment.storageProvider && attachment.storageKey) {
    try {
      await deleteCrmFile(attachment.storageProvider, attachment.storageKey);
    } catch (error) {
      reportCrmIssue("error", "crm.attachments.delete", error, { attachmentId });
    }
  }
  await logAudit({
    action: "CRM_ATTACHMENT_DELETE",
    entity: "CrmAttachment",
    entityId: attachmentId,
    actorId: user.id,
    reason: `Attachment "${attachment.filename}" deleted`,
  });
  revalidateEntity({
    dealId: attachment.dealId,
    leadId: attachment.leadId,
    clientId: attachment.clientId,
  });
  return { ok: true, message: "Attachment deleted." };
}

export async function markCrmNotificationsRead(): Promise<CrmActionResult> {
  const { user } = await crmActor();
  const count = await prisma.crmNotification.updateMany({
    where: { tenantId: TENANT_ID, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/admin/crm");
  return { ok: true, message: `${count} notification(s) marked read.` };
}

// ---------------------------------------------------------------------------
// Mailbox / calendar connections
// ---------------------------------------------------------------------------

export async function syncMyCrmEmail(): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const results = await syncUserCrmEmailConnections(user.id);
  const imported = results.reduce((sum, result) => sum + result.imported, 0);
  const failed = results.filter((result) => result.error).length;
  await logAudit({
    action: "CRM_EMAIL_SYNC",
    entity: "CrmEmailConnection",
    entityId: user.id,
    actorId: user.id,
    reason: `Manually synced ${results.length} mailbox(es)`,
    meta: { connections: results.length, imported, failed },
  }).catch(() => null);
  revalidatePath("/admin/crm/settings");
  return {
    ok: failed === 0,
    message: `Synced ${results.length} mailbox(es); imported ${imported} activity item(s).`,
    error: failed ? `${failed} connection(s) failed to sync.` : undefined,
  };
}

export async function disconnectCrmEmail(connectionId: string): Promise<CrmActionResult> {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const connection = await prisma.crmEmailConnection.findFirst({
    where: {
      id: connectionId,
      tenantId: TENANT_ID,
      ...(access.isAdmin ? {} : { userId: user.id }),
    },
    select: { id: true, email: true, provider: true },
  });
  if (!connection) return { ok: false, error: "Mail connection not found." };
  await prisma.crmEmailConnection.delete({ where: { id: connection.id } });
  await logAudit({
    action: "CRM_EMAIL_DISCONNECT",
    entity: "CrmEmailConnection",
    entityId: connection.id,
    actorId: user.id,
    reason: `Disconnected ${connection.provider} mailbox ${connection.email}`,
    meta: { provider: connection.provider, email: connection.email },
  }).catch(() => null);
  revalidatePath("/admin/crm/settings");
  return { ok: true, message: "Mailbox disconnected." };
}

// ---------------------------------------------------------------------------
// Extra form-action wrappers
// ---------------------------------------------------------------------------

function safeAdminReturn(value: FormDataEntryValue | null, fallback: string): string {
  const raw = String(value ?? "");
  return raw.startsWith("/admin/") ? raw : fallback;
}

export async function crmLeadMergeForm(formData: FormData): Promise<void> {
  const targetId = String(formData.get("targetId") ?? "");
  const result = await mergeLeadRecords(String(formData.get("sourceId") ?? ""), targetId);
  const returnTo = safeAdminReturn(formData.get("returnTo"), `/admin/leads/${targetId}`);
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not merge leads.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent(result.message ?? "Leads merged.")}`);
}

export async function crmClientMergeForm(formData: FormData): Promise<void> {
  const targetId = String(formData.get("targetId") ?? "");
  const result = await mergeClientRecords(String(formData.get("sourceId") ?? ""), targetId);
  const returnTo = safeAdminReturn(formData.get("returnTo"), `/admin/clients/${targetId}`);
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not merge clients.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent(result.message ?? "Clients merged.")}`);
}

export async function crmDealBulkForm(formData: FormData): Promise<void> {
  const action = String(formData.get("bulkAction") ?? "");
  if (action !== "stage" && action !== "owner" && action !== "delete") {
    redirect(`/admin/crm/deals?error=${encodeURIComponent("Choose a bulk action.")}`);
  }
  const result = await bulkDealAction({
    dealIds: formData.getAll("dealIds").map((value) => String(value)),
    action,
    stageId: String(formData.get("bulkStageId") ?? ""),
    ownerId: String(formData.get("bulkOwnerId") ?? ""),
  });
  if (!result.ok) redirect(`/admin/crm/deals?error=${encodeURIComponent(result.error ?? "Bulk action failed.")}`);
  redirect(`/admin/crm/deals?ok=${encodeURIComponent(result.message ?? "Bulk action complete.")}`);
}

export async function crmLineItemAddForm(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const result = await addDealLineItem(dealId, {
    description: String(formData.get("description") ?? ""),
    quantity: String(formData.get("quantity") ?? ""),
    unitPrice: String(formData.get("unitPrice") ?? ""),
    productId: String(formData.get("productId") ?? ""),
  });
  if (!result.ok) dealError(dealId, result.error ?? "Could not add line item.");
  redirect(`/admin/crm/deals/${dealId}?ok=${encodeURIComponent("Line item added.")}`);
}

export async function crmLineItemDeleteForm(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const result = await deleteDealLineItem(String(formData.get("itemId") ?? ""));
  if (!result.ok) dealError(dealId, result.error ?? "Could not delete line item.");
  redirect(`/admin/crm/deals/${dealId}?ok=${encodeURIComponent("Line item deleted.")}`);
}

export async function crmProductCreateForm(formData: FormData): Promise<void> {
  const result = await createCrmProduct({
    name: String(formData.get("name") ?? ""),
    sku: String(formData.get("sku") ?? ""),
    description: String(formData.get("description") ?? ""),
    unitPrice: String(formData.get("unitPrice") ?? ""),
    currency: String(formData.get("currency") ?? ""),
  });
  if (!result.ok) redirect(`/admin/crm/settings?error=${encodeURIComponent(result.error ?? "Could not create product.")}`);
  redirect(`/admin/crm/settings?ok=${encodeURIComponent("Product created.")}`);
}

export async function crmProductDeleteForm(formData: FormData): Promise<void> {
  const result = await deleteCrmProduct(String(formData.get("productId") ?? ""));
  if (!result.ok) redirect(`/admin/crm/settings?error=${encodeURIComponent(result.error ?? "Could not delete product.")}`);
  redirect(`/admin/crm/settings?ok=${encodeURIComponent("Product deleted.")}`);
}

export async function crmAttachmentDeleteForm(formData: FormData): Promise<void> {
  const returnTo = safeAdminReturn(formData.get("returnTo"), "/admin/crm");
  const result = await deleteCrmAttachment(String(formData.get("attachmentId") ?? ""));
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not delete attachment.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent("Attachment deleted.")}`);
}

export async function crmNotificationsReadForm(): Promise<void> {
  const result = await markCrmNotificationsRead();
  redirect(`/admin/crm?ok=${encodeURIComponent(result.message ?? "Notifications marked read.")}`);
}

export async function crmEmailSyncForm(formData: FormData): Promise<void> {
  const result = await syncMyCrmEmail();
  const returnTo = safeCrmReturn(formData.get("returnTo"), "/admin/crm/settings");
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Mail sync failed.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent(result.message ?? "Mail synced.")}`);
}

export async function crmEmailDisconnectForm(formData: FormData): Promise<void> {
  const result = await disconnectCrmEmail(String(formData.get("connectionId") ?? ""));
  const returnTo = safeCrmReturn(formData.get("returnTo"), "/admin/crm/settings");
  if (!result.ok) redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "Could not disconnect mailbox.")}`);
  redirect(`${returnTo}?ok=${encodeURIComponent(result.message ?? "Mailbox disconnected.")}`);
}

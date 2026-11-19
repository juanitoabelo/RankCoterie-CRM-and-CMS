import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { enqueueCrmWebhook } from "@/lib/webhooks/dispatch";
import { logCrmActivity } from "./activity";
import { notifyCrmUser } from "./notifications";
import {
  CRM_WORKFLOW_EVENTS,
  normalizeWorkflowRules,
  workflowMatches,
  type CrmWorkflowAction,
  type CrmWorkflowRule,
} from "./workflows";

export type CrmWorkflowResult = {
  ok: boolean;
  error?: string;
  message?: string;
  id?: string;
};

export type CrmWorkflowEventPayload = Record<string, unknown> & { event: string };

function text(value: FormDataEntryValue | null | undefined): string {
  return String(value ?? "").trim();
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function revalidateWorkflows(): void {
  revalidatePath("/admin/crm/workflows");
}

export async function getCrmWorkflows() {
  return prisma.crmWorkflow.findMany({
    where: { tenantId: TENANT_ID },
    include: { _count: { select: { runs: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCrmWorkflowRuns(limit = 50) {
  return prisma.crmWorkflowRun.findMany({
    where: { tenantId: TENANT_ID },
    include: { workflow: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(200, limit)),
  });
}

export async function createCrmWorkflow(input: {
  name: string;
  description?: string;
  event: string;
  conditions?: unknown;
  actions?: unknown;
}): Promise<CrmWorkflowResult> {
  const user = await requireSection("crm");
  const name = text(input.name);
  if (!name) return { ok: false, error: "Workflow name is required." };
  if (!(CRM_WORKFLOW_EVENTS as readonly string[]).includes(input.event)) {
    return { ok: false, error: "Unknown workflow event." };
  }
  const rules = normalizeWorkflowRules([
    {
      id: "draft",
      name,
      event: input.event,
      enabled: true,
      conditions: input.conditions ?? [],
      actions: input.actions ?? [],
    },
  ]);
  const draft = rules[0];
  if (!draft) return { ok: false, error: "Workflow conditions or actions are invalid." };

  const workflow = await prisma.crmWorkflow.create({
    data: {
      tenantId: TENANT_ID,
      name,
      description: text(input.description) || null,
      event: input.event,
      conditions: jsonValue(draft.conditions),
      actions: jsonValue(draft.actions),
      enabled: true,
      createdById: user.id,
    },
  });
  await logAudit({
    action: "CRM_WORKFLOW_CREATE",
    entity: "CrmWorkflow",
    entityId: workflow.id,
    actorId: user.id,
    reason: `Workflow "${name}" created`,
  });
  revalidateWorkflows();
  return { ok: true, message: "Workflow created.", id: workflow.id };
}

export async function setCrmWorkflowEnabled(id: string, enabled: boolean): Promise<CrmWorkflowResult> {
  await requireSection("crm");
  const result = await prisma.crmWorkflow.updateMany({
    where: { id, tenantId: TENANT_ID },
    data: { enabled },
  });
  if (result.count === 0) return { ok: false, error: "Workflow not found." };
  revalidateWorkflows();
  return { ok: true, message: enabled ? "Workflow enabled." : "Workflow paused." };
}

export async function deleteCrmWorkflow(id: string): Promise<CrmWorkflowResult> {
  const user = await requireSection("crm");
  const workflow = await prisma.crmWorkflow.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { name: true },
  });
  if (!workflow) return { ok: false, error: "Workflow not found." };
  await prisma.crmWorkflow.delete({ where: { id } });
  await logAudit({
    action: "CRM_WORKFLOW_DELETE",
    entity: "CrmWorkflow",
    entityId: id,
    actorId: user.id,
    reason: `Workflow "${workflow.name}" deleted`,
  });
  revalidateWorkflows();
  return { ok: true, message: "Workflow deleted." };
}

function actionLink(payload: CrmWorkflowEventPayload): string | null {
  if (typeof payload.dealId === "string") return `/admin/crm/deals/${payload.dealId}`;
  if (typeof payload.leadId === "string") return `/admin/leads/${payload.leadId}`;
  if (typeof payload.clientId === "string") return `/admin/clients/${payload.clientId}`;
  return null;
}

async function executeWorkflowAction(
  rule: CrmWorkflowRule,
  action: CrmWorkflowAction,
  payload: CrmWorkflowEventPayload,
): Promise<void> {
  const leadId = typeof payload.leadId === "string" ? payload.leadId : null;
  const clientId = typeof payload.clientId === "string" ? payload.clientId : null;
  const dealId = typeof payload.dealId === "string" ? payload.dealId : null;
  const link = actionLink(payload);

  if (action.type === "create_task") {
    if (!leadId && !clientId && !dealId) return;
    await prisma.toDo.create({
      data: {
        text: action.text,
        priority: "NORMAL",
        status: "OPEN",
        leadId,
        clientId,
        dealId,
        assigneeId: action.assigneeId || null,
      },
    });
    return;
  }

  if (action.type === "log_note") {
    if (!leadId && !clientId && !dealId) return;
    await logCrmActivity({
      type: "NOTE",
      subject: rule.name,
      body: action.text,
      leadId,
      clientId,
      dealId,
      source: "workflow",
    });
    return;
  }

  if (action.assigneeId) {
    await notifyCrmUser({
      userId: action.assigneeId,
      type: "WORKFLOW_NOTIFICATION",
      title: rule.name,
      body: action.text,
      link,
    });
  }
}

export async function runCrmWorkflows(
  event: string,
  payload: Record<string, unknown>,
): Promise<{ evaluated: number; matched: number; failed: number }> {
  const eventPayload: CrmWorkflowEventPayload = { ...payload, event };
  const result = { evaluated: 0, matched: 0, failed: 0 };
  const rows = await prisma.crmWorkflow.findMany({
    where: { tenantId: TENANT_ID, event, enabled: true },
  });

  for (const row of rows) {
    result.evaluated += 1;
    const rule = normalizeWorkflowRules([
      {
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        event: row.event,
        enabled: true,
        conditions: row.conditions,
        actions: row.actions,
      },
    ])[0];
    const matched = Boolean(rule && workflowMatches(rule, eventPayload));

    const run = await prisma.crmWorkflowRun.create({
      data: {
        tenantId: TENANT_ID,
        workflowId: row.id,
        event,
        payload: jsonValue(payload),
        matched,
        actions: jsonValue(rule?.actions ?? []),
        status: matched ? "COMPLETED" : "SKIPPED",
      },
    });

    if (!matched || !rule) continue;
    result.matched += 1;

    for (const action of rule.actions) {
      try {
        await executeWorkflowAction(rule, action, eventPayload);
      } catch (error) {
        result.failed += 1;
        await prisma.crmWorkflowRun.update({
          where: { id: run.id },
          data: {
            status: "FAILED",
            error: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
          },
        });
        reportCrmIssue("error", "crm.workflow.action", error, {
          workflowId: row.id,
          runId: run.id,
          actionType: action.type,
        });
      }
    }
  }

  await enqueueCrmWebhook(event, payload).catch((error) => {
    reportCrmIssue("error", "crm.workflow.webhook", error, { event });
  });
  return result;
}

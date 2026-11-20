import { NextRequest } from "next/server";
import { Prisma, type Deal } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";
import { logCrmActivity } from "@/modules/crm/activity";
import { runCrmWorkflows } from "@/modules/crm/workflow-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeDeal(deal: Deal) {
  return {
    id: deal.id,
    title: deal.title,
    stageId: deal.stageId,
    value: Number(deal.value),
    currency: deal.currency,
    probability: deal.probability,
    expectedCloseDate: deal.expectedCloseDate?.toISOString() ?? null,
    source: deal.source,
    ownerId: deal.ownerId,
    leadId: deal.leadId,
    clientId: deal.clientId,
    companyName: deal.companyName,
    contactName: deal.contactName,
    contactEmail: deal.contactEmail,
    contactPhone: deal.contactPhone,
    notes: deal.notes,
    lostReason: deal.lostReason,
    wonAt: deal.wonAt?.toISOString() ?? null,
    closedAt: deal.closedAt?.toISOString() ?? null,
    stageChangedAt: deal.stageChangedAt.toISOString(),
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date.");
  return date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const deal = await prisma.deal.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!deal) return apiError(404, "Deal not found.");
  return apiSuccess(serializeDeal(deal));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.deal.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: { stage: { select: { label: true } } },
  });
  if (!existing) return apiError(404, "Deal not found.");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const data: Prisma.DealUncheckedUpdateInput = {};

  if (body.title !== undefined) {
    const title = String(body.title ?? "").trim();
    if (!title) return apiError(400, "Deal title cannot be empty.");
    data.title = title;
  }
  if (body.value !== undefined) {
    const value = Number(body.value);
    if (!Number.isFinite(value) || value < 0) return apiError(400, "Invalid deal value.");
    data.value = new Prisma.Decimal(value.toFixed(2));
  }
  if (body.currency !== undefined) {
    data.currency = String(body.currency).toUpperCase().slice(0, 3) || "USD";
  }
  if (body.probability !== undefined) {
    data.probability =
      body.probability === null
        ? null
        : Math.max(0, Math.min(100, Number(body.probability) || 0));
  }
  try {
    if (body.expectedCloseDate !== undefined) {
      data.expectedCloseDate = parseDate(body.expectedCloseDate) ?? null;
    }
  } catch {
    return apiError(400, "Invalid expected close date.");
  }
  for (const key of [
    "source",
    "ownerId",
    "leadId",
    "clientId",
    "companyName",
    "contactName",
    "contactEmail",
    "contactPhone",
    "notes",
    "lostReason",
  ] as const) {
    if (body[key] !== undefined) {
      data[key] = body[key] === null || body[key] === "" ? null : String(body[key]);
    }
  }

  let nextStage: { id: string; label: string } = {
    id: existing.stageId,
    label: existing.stage.label,
  };
  let stageChanged = false;
  if (body.stageId !== undefined && body.stageId !== null && String(body.stageId) !== existing.stageId) {
    const stage = await prisma.crmStage.findFirst({
      where: { id: String(body.stageId), tenantId: TENANT_ID, active: true },
    });
    if (!stage) return apiError(400, "Invalid pipeline stage.");
    nextStage = { id: stage.id, label: stage.label };
    stageChanged = true;
    data.stageId = stage.id;
    data.pipelineId = stage.pipelineId;
    data.stageChangedAt = new Date();
    data.lastActivityAt = new Date();
    if (stage.isWon) {
      data.wonAt = new Date();
      data.closedAt = new Date();
      data.lostReason = null;
    } else if (stage.isLost) {
      data.wonAt = null;
      data.closedAt = new Date();
    } else {
      data.wonAt = null;
      data.closedAt = null;
      data.lostReason = null;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.deal.update({ where: { id }, data });
    if (stageChanged) {
      await logCrmActivity({
        type: "STAGE_CHANGE",
        subject: `${existing.stage.label} → ${nextStage.label}`,
        userId: null,
        leadId: row.leadId,
        clientId: row.clientId,
        dealId: row.id,
        metadata: { from: existing.stageId, to: nextStage.id, source: "public_api" },
        source: "public_api",
        client: tx,
      });
    }
    return row;
  });
  await logAudit({
    action: "DEAL_UPDATE",
    entity: "Deal",
    entityId: id,
    actorId: null,
    reason: `Deal "${updated.title}" updated via public API`,
    meta: { keyId: auth.keyId, stageChanged: data.stageId !== undefined },
  }).catch(() => null);
  await runCrmWorkflows(
    data.stageId !== undefined ? "deal.stage_changed" : "deal.updated",
    {
      dealId: updated.id,
      title: updated.title,
      value: Number(updated.value),
      stageId: updated.stageId,
      stageLabel: nextStage.label,
      previousStageId: existing.stageId,
      previousStageLabel: existing.stage.label,
      leadId: updated.leadId,
      clientId: updated.clientId,
      ownerId: updated.ownerId,
      source: updated.source,
    },
  ).catch((error) => reportCrmIssue("error", "crm.workflow.apiDealUpdated", error));
  return apiSuccess(serializeDeal(updated));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.deal.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!existing) return apiError(404, "Deal not found.");
  await prisma.deal.delete({ where: { id } });
  await logAudit({
    action: "DEAL_DELETE",
    entity: "Deal",
    entityId: id,
    actorId: null,
    reason: `Deal "${existing.title}" deleted via public API`,
    meta: { keyId: auth.keyId },
  }).catch(() => null);
  return apiSuccess({ id });
}

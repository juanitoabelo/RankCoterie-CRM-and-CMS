import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { apiError, apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
import { getDefaultCrmStage } from "@/modules/crm/stages";
import { runCrmWorkflows } from "@/modules/crm/workflow-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeDeal(deal: {
  id: string;
  title: string;
  value: Prisma.Decimal;
  currency: string;
  stageId: string;
  probability: number | null;
  expectedCloseDate: Date | null;
  source: string | null;
  ownerId: string | null;
  leadId: string | null;
  clientId: string | null;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  stageChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...deal,
    value: Number(deal.value),
    expectedCloseDate: deal.expectedCloseDate?.toISOString() ?? null,
    stageChangedAt: deal.stageChangedAt.toISOString(),
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;

  const { page, limit, skip } = pagination(request);
  const search = request.nextUrl.searchParams.get("q")?.trim();
  const where: Prisma.DealWhereInput = {
    tenantId: TENANT_ID,
    ...(request.nextUrl.searchParams.get("stageId")
      ? { stageId: request.nextUrl.searchParams.get("stageId") as string }
      : {}),
    ...(request.nextUrl.searchParams.get("source")
      ? { source: request.nextUrl.searchParams.get("source") as string }
      : {}),
    ...(request.nextUrl.searchParams.get("ownerId")
      ? { ownerId: request.nextUrl.searchParams.get("ownerId") as string }
      : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { companyName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.deal.count({ where }),
  ]);

  return apiSuccess({ items: items.map(serializeDeal), total, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = String(body?.title ?? "").trim();
  if (!title) return apiError(400, "Deal title is required.");

  const value = Number(body?.value ?? 0);
  if (!Number.isFinite(value) || value < 0) return apiError(400, "Invalid deal value.");
  const stageId = String(body?.stageId ?? "") || (await getDefaultCrmStage())?.id;
  if (!stageId) return apiError(400, "No pipeline stage is available.");
  const stage = await prisma.crmStage.findFirst({
    where: { id: stageId, tenantId: TENANT_ID, active: true },
  });
  if (!stage) return apiError(400, "Invalid pipeline stage.");

  const expectedCloseDateRaw = body?.expectedCloseDate ? String(body.expectedCloseDate) : "";
  const expectedCloseDate = expectedCloseDateRaw ? new Date(expectedCloseDateRaw) : null;
  if (expectedCloseDate && Number.isNaN(expectedCloseDate.getTime())) {
    return apiError(400, "Invalid expected close date.");
  }

  const deal = await prisma.deal.create({
    data: {
      tenantId: TENANT_ID,
      title,
      value: new Prisma.Decimal(value.toFixed(2)),
      currency: String(body?.currency ?? "USD").toUpperCase().slice(0, 3) || "USD",
      stageId,
      pipelineId: stage.pipelineId,
      probability:
        body?.probability === null || body?.probability === undefined
          ? null
          : Math.max(0, Math.min(100, Number(body.probability) || 0)),
      expectedCloseDate,
      source: body?.source ? String(body.source).slice(0, 200) : null,
      ownerId: body?.ownerId ? String(body.ownerId) : null,
      leadId: body?.leadId ? String(body.leadId) : null,
      clientId: body?.clientId ? String(body.clientId) : null,
      companyName: body?.companyName ? String(body.companyName) : null,
      contactName: body?.contactName ? String(body.contactName) : null,
      contactEmail: body?.contactEmail ? String(body.contactEmail) : null,
      notes: body?.notes ? String(body.notes) : null,
      lastActivityAt: new Date(),
    },
  });

  await logAudit({
    action: "DEAL_CREATE",
    entity: "Deal",
    entityId: deal.id,
    actorId: null,
    reason: `Deal "${title}" created via public API`,
    meta: { keyId: auth.keyId, stageId, value },
  }).catch(() => null);
  await runCrmWorkflows("deal.created", {
    dealId: deal.id,
    title: deal.title,
    value: Number(deal.value),
    stageId: deal.stageId,
    stageLabel: stage.label,
    leadId: deal.leadId,
    clientId: deal.clientId,
    ownerId: deal.ownerId,
    source: deal.source,
  }).catch((error) => reportCrmIssue("error", "crm.workflow.apiDealCreated", error));

  return apiSuccess(serializeDeal(deal));
}

import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";
import { runCrmWorkflows } from "@/modules/crm/workflow-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serializeLead(lead: Prisma.LeadGetPayload<{}>) {
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phones: lead.phones,
    status: lead.status,
    disposition: lead.disposition,
    score: lead.score,
    assignedToId: lead.assignedToId,
    campaignId: lead.campaignId,
    createdAt: lead.createdAt.toISOString(),
    lastModified: lead.lastModified.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!lead) return apiError(404, "Lead not found.");
  return apiSuccess(serializeLead(lead));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!existing) return apiError(404, "Lead not found.");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const data: Prisma.LeadUncheckedUpdateInput = {};
  for (const key of [
    "firstName",
    "lastName",
    "email",
    "status",
    "disposition",
    "assignedToId",
    "campaignId",
  ] as const) {
    if (body[key] !== undefined) {
      (data as Record<string, unknown>)[key] =
        body[key] === null || body[key] === "" ? null : String(body[key]);
    }
  }
  if (body.score !== undefined) {
    data.score = Math.max(0, Math.min(100, Number(body.score) || 0));
  }
  if (body.phone !== undefined) {
    const phones =
      existing.phones && typeof existing.phones === "object" && !Array.isArray(existing.phones)
        ? (existing.phones as Record<string, unknown>)
        : {};
    phones.mobile = body.phone === null || body.phone === "" ? "" : String(body.phone);
    data.phones = phones as Prisma.InputJsonValue;
  }
  const lead = await prisma.lead.update({ where: { id }, data });
  await logAudit({
    action: "LEAD_UPDATE",
    entity: "Lead",
    entityId: id,
    actorId: null,
    reason: "Lead updated via public API",
    meta: { keyId: auth.keyId },
  }).catch(() => null);
  await runCrmWorkflows("lead.updated", {
    leadId: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    status: lead.status,
    ownerId: lead.assignedToId,
    score: lead.score,
  }).catch((error) => reportCrmIssue("error", "crm.workflow.apiLeadUpdated", error));
  return apiSuccess(serializeLead(lead));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!existing) return apiError(404, "Lead not found.");
  await prisma.lead.delete({ where: { id } });
  await logAudit({
    action: "LEAD_DELETE",
    entity: "Lead",
    entityId: id,
    actorId: null,
    reason: "Lead deleted via public API",
    meta: { keyId: auth.keyId },
  }).catch(() => null);
  return apiSuccess({ id });
}

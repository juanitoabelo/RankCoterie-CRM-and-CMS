import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";
import { serializeCrmWorkflow } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const workflow = await prisma.crmWorkflow.findFirst({
    where: { id, tenantId: TENANT_ID },
  });
  if (!workflow) return apiError(404, "Workflow not found.");
  return apiSuccess(serializeCrmWorkflow(workflow));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.crmWorkflow.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!existing) return apiError(404, "Workflow not found.");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const data: Prisma.CrmWorkflowUncheckedUpdateInput = {};
  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return apiError(400, "Workflow name cannot be empty.");
    data.name = name;
  }
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null;
  }
  if (body.event !== undefined) {
    const event = String(body.event ?? "").trim();
    if (!event) return apiError(400, "Workflow event cannot be empty.");
    data.event = event;
  }
  for (const key of ["conditions", "actions"] as const) {
    if (body[key] !== undefined) {
      if (!Array.isArray(body[key])) return apiError(400, `${key} must be an array.`);
      data[key] = body[key] as Prisma.InputJsonValue;
    }
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") return apiError(400, "Enabled must be a boolean.");
    data.enabled = body.enabled;
  }

  const workflow = await prisma.crmWorkflow.update({ where: { id }, data });
  await logAudit({
    action: "CRM_WORKFLOW_UPDATE",
    entity: "CrmWorkflow",
    entityId: id,
    actorId: null,
    reason: "Workflow updated via public API",
    meta: { keyId: auth.keyId, fields: Object.keys(data) },
  }).catch(() => null);
  return apiSuccess(serializeCrmWorkflow(workflow));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.crmWorkflow.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!existing) return apiError(404, "Workflow not found.");
  await prisma.crmWorkflow.delete({ where: { id } });
  await logAudit({
    action: "CRM_WORKFLOW_DELETE",
    entity: "CrmWorkflow",
    entityId: id,
    actorId: null,
    reason: "Workflow deleted via public API",
    meta: { keyId: auth.keyId },
  }).catch(() => null);
  return apiSuccess({ id });
}

import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";
import { serializeCrmSequence } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const sequence = await prisma.crmEmailSequence.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      steps: { orderBy: { position: "asc" } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!sequence) return apiError(404, "Sequence not found.");
  return apiSuccess(serializeCrmSequence(sequence));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.crmEmailSequence.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!existing) return apiError(404, "Sequence not found.");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const data: Prisma.CrmEmailSequenceUncheckedUpdateInput = {};
  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return apiError(400, "Sequence name cannot be empty.");
    data.name = name;
  }
  if (body.subject !== undefined) {
    const subject = String(body.subject ?? "").trim();
    if (!subject) return apiError(400, "Sequence subject cannot be empty.");
    data.subject = subject;
  }
  if (body.body !== undefined) {
    const text = String(body.body ?? "").trim();
    if (!text) return apiError(400, "Sequence body cannot be empty.");
    data.body = text;
  }
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null;
  }
  if (body.status !== undefined) {
    const status = String(body.status);
    if (!STATUSES.includes(status)) return apiError(400, "Invalid sequence status.");
    data.status = status;
  }

  const sequence = await prisma.crmEmailSequence.update({ where: { id }, data });
  await logAudit({
    action: "CRM_SEQUENCE_UPDATE",
    entity: "CrmEmailSequence",
    entityId: id,
    actorId: null,
    reason: "Sequence updated via public API",
    meta: { keyId: auth.keyId, fields: Object.keys(data) },
  }).catch(() => null);
  return apiSuccess(serializeCrmSequence(sequence));
}

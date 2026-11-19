import { NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";
import { serializeCrmSequenceStep } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const sequence = await prisma.crmEmailSequence.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!sequence) return apiError(404, "Sequence not found.");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const subject = String(body.subject ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!subject || !text) return apiError(400, "Subject and body are required.");
  const delayMinutes = body.delayMinutes === undefined ? 0 : Number(body.delayMinutes);
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0) {
    return apiError(400, "Delay must be a non-negative number of minutes.");
  }

  const last = await prisma.crmEmailSequenceStep.findFirst({
    where: { sequenceId: id, tenantId: TENANT_ID },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let position = last ? last.position + 1 : 0;
  if (body.position !== undefined) {
    position = Number(body.position);
    if (!Number.isInteger(position) || position < 0) {
      return apiError(400, "Position must be a non-negative integer.");
    }
    const conflict = await prisma.crmEmailSequenceStep.findFirst({
      where: { sequenceId: id, tenantId: TENANT_ID, position },
      select: { id: true },
    });
    if (conflict) return apiError(409, "A step already exists at that position.");
  }

  const step = await prisma.crmEmailSequenceStep.create({
    data: {
      tenantId: TENANT_ID,
      sequenceId: id,
      position,
      subject,
      body: text,
      delayMinutes,
    },
  });
  await logAudit({
    action: "CRM_SEQUENCE_STEP_ADD",
    entity: "CrmEmailSequenceStep",
    entityId: step.id,
    actorId: null,
    reason: "Step added to sequence via public API",
    meta: { keyId: auth.keyId, sequenceId: id, position },
  }).catch(() => null);
  return apiSuccess(serializeCrmSequenceStep(step));
}

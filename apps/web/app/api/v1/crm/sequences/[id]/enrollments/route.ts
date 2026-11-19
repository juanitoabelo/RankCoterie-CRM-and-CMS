import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { apiError, apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
import { serializeCrmEnrollment } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "PAUSED", "COMPLETED", "FAILED"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const { page, limit, skip } = pagination(request);
  const where = { tenantId: TENANT_ID, sequenceId: id };
  const [items, total] = await Promise.all([
    prisma.crmEmailSequenceEnrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.crmEmailSequenceEnrollment.count({ where }),
  ]);
  return apiSuccess({ items: items.map(serializeCrmEnrollment), total, page, limit });
}

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
  const toEmail = String(body.toEmail ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return apiError(400, "A valid recipient email is required.");
  }

  const optionalId = async (value: unknown, model: "lead" | "client" | "deal") => {
    if (value === undefined || value === null || value === "") return { id: null, invalid: false };
    const relatedId = String(value);
    const where = { id: relatedId, tenantId: TENANT_ID };
    const record =
      model === "lead"
        ? await prisma.lead.findFirst({ where, select: { id: true } })
        : model === "client"
          ? await prisma.client.findFirst({ where, select: { id: true } })
          : await prisma.deal.findFirst({ where, select: { id: true } });
    return record ? { id: relatedId, invalid: false } : { id: null, invalid: true };
  };
  const [lead, client, deal] = await Promise.all([
    optionalId(body.leadId, "lead"),
    optionalId(body.clientId, "client"),
    optionalId(body.dealId, "deal"),
  ]);
  if (lead.invalid || client.invalid || deal.invalid) {
    return apiError(400, "Linked record not found.");
  }

  let connectionId: string | null = null;
  if (body.connectionId) {
    const connection = await prisma.crmEmailConnection.findFirst({
      where: { id: String(body.connectionId), tenantId: TENANT_ID, active: true },
      select: { id: true },
    });
    if (!connection) return apiError(400, "Mail connection not found.");
    connectionId = connection.id;
  }

  let nextSendAt = new Date();
  if (body.nextSendAt !== undefined) {
    nextSendAt = new Date(String(body.nextSendAt));
    if (Number.isNaN(nextSendAt.getTime())) return apiError(400, "Invalid next send date.");
  }
  const currentStep = body.currentStep === undefined ? 0 : Number(body.currentStep);
  if (!Number.isInteger(currentStep) || currentStep < 0) {
    return apiError(400, "Current step must be a non-negative integer.");
  }
  const status = body.status === undefined ? "ACTIVE" : String(body.status);
  if (!STATUSES.includes(status)) return apiError(400, "Invalid enrollment status.");

  try {
    const enrollment = await prisma.crmEmailSequenceEnrollment.create({
      data: {
        tenantId: TENANT_ID,
        sequenceId: id,
        leadId: lead.id,
        clientId: client.id,
        dealId: deal.id,
        connectionId,
        toEmail,
        status,
        currentStep,
        nextSendAt,
      },
    });
    await logAudit({
      action: "CRM_SEQUENCE_ENROLL",
      entity: "CrmEmailSequenceEnrollment",
      entityId: enrollment.id,
      actorId: null,
      reason: "Contact enrolled via public API",
      meta: { keyId: auth.keyId, sequenceId: id, toEmail },
    }).catch(() => null);
    return apiSuccess(serializeCrmEnrollment(enrollment));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "This email is already enrolled in the sequence.");
    }
    throw error;
  }
}

import { NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { apiError, apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
import { serializeCrmSequence } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED"];

export async function GET(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { page, limit, skip } = pagination(request);
  const status = request.nextUrl.searchParams.get("status");
  const where = {
    tenantId: TENANT_ID,
    ...(status ? { status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.crmEmailSequence.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { _count: { select: { steps: true, enrollments: true } } },
    }),
    prisma.crmEmailSequence.count({ where }),
  ]);
  return apiSuccess({
    items: items.map(serializeCrmSequence),
    total,
    page,
    limit,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const name = String(body.name ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!name || !subject || !text) {
    return apiError(400, "Name, subject, and body are required.");
  }
  const status = body.status === undefined ? "DRAFT" : String(body.status);
  if (!STATUSES.includes(status)) return apiError(400, "Invalid sequence status.");

  const sequence = await prisma.crmEmailSequence.create({
    data: {
      tenantId: TENANT_ID,
      name,
      subject,
      body: text,
      description: body.description ? String(body.description).trim() : null,
      status,
      createdById: null,
    },
  });
  await logAudit({
    action: "CRM_SEQUENCE_CREATE",
    entity: "CrmEmailSequence",
    entityId: sequence.id,
    actorId: null,
    reason: `Sequence "${name}" created via public API`,
    meta: { keyId: auth.keyId },
  }).catch(() => null);
  return apiSuccess(serializeCrmSequence(sequence));
}

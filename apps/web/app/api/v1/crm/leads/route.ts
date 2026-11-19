import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { apiError, apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
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

export async function GET(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { page, limit, skip } = pagination(request);
  const search = request.nextUrl.searchParams.get("q")?.trim();
  const where: Prisma.LeadWhereInput = {
    tenantId: TENANT_ID,
    ...(request.nextUrl.searchParams.get("status")
      ? { status: request.nextUrl.searchParams.get("status") as string }
      : {}),
    ...(request.nextUrl.searchParams.get("assignedToId")
      ? { assignedToId: request.nextUrl.searchParams.get("assignedToId") as string }
      : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.lead.count({ where }),
  ]);
  return apiSuccess({ items: items.map(serializeLead), total, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const email = body.email ? String(body.email).trim() : null;
  const firstName = body.firstName ? String(body.firstName).trim() : null;
  const lastName = body.lastName ? String(body.lastName).trim() : null;
  if (!email && !firstName && !lastName) {
    return apiError(400, "Provide an email or name for the lead.");
  }
  const phone = body.phone ? String(body.phone).trim() : null;
  const lead = await prisma.lead.create({
    data: {
      tenantId: TENANT_ID,
      firstName,
      lastName,
      email,
      status: body.status ? String(body.status).slice(0, 50) : "NEW",
      assignedToId: body.assignedToId ? String(body.assignedToId) : null,
      campaignId: body.campaignId ? String(body.campaignId) : null,
      phones: (phone ? { mobile: phone } : {}) as Prisma.InputJsonValue,
    },
  });
  await logAudit({
    action: "LEAD_CREATE",
    entity: "Lead",
    entityId: lead.id,
    actorId: null,
    reason: "Lead created via public API",
    meta: { keyId: auth.keyId, email },
  }).catch(() => null);
  await runCrmWorkflows("lead.created", {
    leadId: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    status: lead.status,
    ownerId: lead.assignedToId,
    score: lead.score,
  }).catch((error) => reportCrmIssue("error", "crm.workflow.apiLeadCreated", error));
  return apiSuccess(serializeLead(lead));
}

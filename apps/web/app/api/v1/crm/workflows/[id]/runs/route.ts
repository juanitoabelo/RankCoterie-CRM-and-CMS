import { NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { apiError, apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
import { serializeCrmWorkflowRun } from "@/modules/api/serializers";

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
    select: { id: true },
  });
  if (!workflow) return apiError(404, "Workflow not found.");
  const { page, limit, skip } = pagination(request);
  const query = request.nextUrl.searchParams;
  const where = {
    tenantId: TENANT_ID,
    workflowId: id,
    ...(query.get("status") ? { status: query.get("status") as string } : {}),
    ...(query.get("event") ? { event: query.get("event") as string } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.crmWorkflowRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.crmWorkflowRun.count({ where }),
  ]);
  return apiSuccess({ items: items.map(serializeCrmWorkflowRun), total, page, limit });
}

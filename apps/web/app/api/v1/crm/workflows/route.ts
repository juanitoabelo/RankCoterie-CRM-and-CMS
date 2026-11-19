import { NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
import { serializeCrmWorkflow } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { page, limit, skip } = pagination(request);
  const params = request.nextUrl.searchParams;
  const event = params.get("event");
  const enabled = params.get("enabled");
  const where = {
    tenantId: TENANT_ID,
    ...(event ? { event } : {}),
    ...(enabled === "true" ? { enabled: true } : enabled === "false" ? { enabled: false } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.crmWorkflow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.crmWorkflow.count({ where }),
  ]);
  return apiSuccess({ items: items.map(serializeCrmWorkflow), total, page, limit });
}

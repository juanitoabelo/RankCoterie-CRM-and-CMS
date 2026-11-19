import { NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
import { serializeWebhookDelivery } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { page, limit, skip } = pagination(request);
  const params = request.nextUrl.searchParams;
  const where = {
    tenantId: TENANT_ID,
    ...(params.get("status") ? { status: params.get("status") as string } : {}),
    ...(params.get("event") ? { event: params.get("event") as string } : {}),
    ...(params.get("endpointId")
      ? { endpointId: params.get("endpointId") as string }
      : {}),
  };
  const [items, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where,
      include: { endpoint: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.webhookDelivery.count({ where }),
  ]);
  return apiSuccess({ items: items.map(serializeWebhookDelivery), total, page, limit });
}

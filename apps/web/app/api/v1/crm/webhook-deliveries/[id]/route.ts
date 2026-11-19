import { NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";
import { serializeWebhookDelivery } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: { endpoint: true },
  });
  if (!delivery) return apiError(404, "Webhook delivery not found.");
  return apiSuccess(serializeWebhookDelivery(delivery));
}

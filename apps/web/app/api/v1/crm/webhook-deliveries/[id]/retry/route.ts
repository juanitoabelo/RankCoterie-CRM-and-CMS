import { NextRequest } from "next/server";
import { logAudit } from "@/lib/audit";
import { retryWebhookDelivery } from "@/lib/webhooks/dispatch";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const result = await retryWebhookDelivery(id);
  if (result.status === "NOT_FOUND") return apiError(404, "Webhook delivery not found.");
  if (result.status === "SUCCESS") {
    return apiError(400, "Successful deliveries cannot be retried.");
  }
  await logAudit({
    action: "WEBHOOK_DELIVERY_RETRY",
    entity: "WebhookDelivery",
    entityId: id,
    actorId: null,
    reason: "Webhook delivery retried via public API",
    meta: { keyId: auth.keyId, status: result.status, responseStatus: result.responseStatus ?? null },
  }).catch(() => null);
  return apiSuccess({ id, status: result.status, ok: result.ok });
}

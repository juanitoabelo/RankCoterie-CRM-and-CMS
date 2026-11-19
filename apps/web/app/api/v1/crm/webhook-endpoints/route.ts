import { randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { isValidWebhookEvent } from "@/lib/webhooks/events";
import { apiError, apiSuccess, authenticateCrmApi, pagination } from "@/modules/api/crm-api";
import { serializeWebhookEndpoint } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { page, limit, skip } = pagination(request);
  const where = { tenantId: TENANT_ID };
  const [items, total] = await Promise.all([
    prisma.webhookEndpoint.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { _count: { select: { deliveries: true } } },
    }),
    prisma.webhookEndpoint.count({ where }),
  ]);
  return apiSuccess({ items: items.map(serializeWebhookEndpoint), total, page, limit });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const name = String(body.name ?? "").trim();
  const url = String(body.url ?? "").trim();
  if (!name) return apiError(400, "Endpoint name is required.");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return apiError(400, "Endpoint URL must use http or https.");
    }
  } catch {
    return apiError(400, "Endpoint URL is invalid.");
  }
  if (!Array.isArray(body.events) || !body.events.length) {
    return apiError(400, "At least one event is required.");
  }
  const events = body.events.map(String);
  if (!events.every(isValidWebhookEvent)) return apiError(400, "Invalid webhook event.");
  const maxRetries = body.maxRetries === undefined ? 3 : Number(body.maxRetries);
  const retryDelay = body.retryDelay === undefined ? 60 : Number(body.retryDelay);
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 20) {
    return apiError(400, "Max retries must be an integer between 0 and 20.");
  }
  if (!Number.isInteger(retryDelay) || retryDelay < 0 || retryDelay > 86400) {
    return apiError(400, "Retry delay must be an integer between 0 and 86400 seconds.");
  }

  const secret = randomBytes(32).toString("hex");
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      tenantId: TENANT_ID,
      name,
      url,
      events,
      secret,
      secretKey: secret,
      isActive: body.isActive === undefined ? true : body.isActive === true,
      maxRetries,
      retryDelay,
    },
  });
  await logAudit({
    action: "WEBHOOK_ENDPOINT_CREATE",
    entity: "WebhookEndpoint",
    entityId: endpoint.id,
    actorId: null,
    reason: `Webhook endpoint "${name}" created via public API`,
    meta: { keyId: auth.keyId, events },
  }).catch(() => null);
  return apiSuccess(serializeWebhookEndpoint(endpoint));
}

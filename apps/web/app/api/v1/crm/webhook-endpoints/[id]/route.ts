import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { isValidWebhookEvent } from "@/lib/webhooks/events";
import { apiError, apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";
import { serializeWebhookEndpoint } from "@/modules/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: { _count: { select: { deliveries: true } } },
  });
  if (!endpoint) return apiError(404, "Webhook endpoint not found.");
  return apiSuccess(serializeWebhookEndpoint(endpoint));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!existing) return apiError(404, "Webhook endpoint not found.");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError(400, "Invalid JSON body.");
  const data: Prisma.WebhookEndpointUncheckedUpdateInput = {};
  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return apiError(400, "Endpoint name cannot be empty.");
    data.name = name;
  }
  if (body.url !== undefined) {
    const url = String(body.url ?? "").trim();
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return apiError(400, "Endpoint URL must use http or https.");
      }
    } catch {
      return apiError(400, "Endpoint URL is invalid.");
    }
    data.url = url;
  }
  if (body.events !== undefined) {
    if (!Array.isArray(body.events) || !body.events.length) {
      return apiError(400, "At least one event is required.");
    }
    const events = body.events.map(String);
    if (!events.every(isValidWebhookEvent)) return apiError(400, "Invalid webhook event.");
    data.events = { set: events };
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      return apiError(400, "isActive must be a boolean.");
    }
    data.isActive = body.isActive;
  }
  for (const key of ["maxRetries", "retryDelay"] as const) {
    if (body[key] !== undefined) {
      const value = Number(body[key]);
      const max = key === "maxRetries" ? 20 : 86400;
      if (!Number.isInteger(value) || value < 0 || value > max) {
        return apiError(400, `${key} must be an integer between 0 and ${max}.`);
      }
      data[key] = value;
    }
  }

  const endpoint = await prisma.webhookEndpoint.update({ where: { id }, data });
  await logAudit({
    action: "WEBHOOK_ENDPOINT_UPDATE",
    entity: "WebhookEndpoint",
    entityId: id,
    actorId: null,
    reason: "Webhook endpoint updated via public API",
    meta: { keyId: auth.keyId, fields: Object.keys(data) },
  }).catch(() => null);
  return apiSuccess(serializeWebhookEndpoint(endpoint));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateCrmApi(request, "crm:write");
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!existing) return apiError(404, "Webhook endpoint not found.");
  await prisma.webhookEndpoint.delete({ where: { id } });
  await logAudit({
    action: "WEBHOOK_ENDPOINT_DELETE",
    entity: "WebhookEndpoint",
    entityId: id,
    actorId: null,
    reason: "Webhook endpoint deleted via public API",
    meta: { keyId: auth.keyId },
  }).catch(() => null);
  return apiSuccess({ id });
}

import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { signWebhookPayload } from "./signature";

export { CRM_WEBHOOK_EVENTS } from "./events";

export type WebhookDeliveryResult = {
  ok: boolean;
  status: "SUCCESS" | "PENDING" | "GIVEN_UP" | "SKIPPED" | "NOT_FOUND";
  responseStatus?: number | null;
  error?: string;
};

export async function enqueueCrmWebhook(
  event: string,
  payload: Record<string, unknown>,
): Promise<number> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { tenantId: TENANT_ID, isActive: true, events: { has: event } },
  });
  for (const endpoint of endpoints) {
    await prisma.webhookDelivery.create({
      data: {
        tenantId: TENANT_ID,
        endpointId: endpoint.id,
        event,
        payload: payload as Prisma.InputJsonValue,
        attempt: 1,
        status: "PENDING",
      },
    });
  }
  return endpoints.length;
}

export async function deliverWebhookDelivery(
  deliveryId: string,
): Promise<WebhookDeliveryResult> {
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, tenantId: TENANT_ID },
    include: { endpoint: true },
  });
  if (!delivery) return { ok: false, status: "NOT_FOUND", error: "Delivery not found." };

  const endpoint = delivery.endpoint;
  if (!endpoint?.isActive) {
    return { ok: false, status: "SKIPPED", error: "Webhook endpoint is inactive." };
  }

  const body = JSON.stringify({
    id: delivery.id,
    event: delivery.event,
    createdAt: delivery.createdAt.toISOString(),
    data: delivery.payload,
  });
  const secret = endpoint.secretKey || endpoint.secret;
  let status = 0;
  let responseBody = "";

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Canopy-Event": delivery.event,
        "X-Canopy-Signature": signWebhookPayload(secret, body),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    status = response.status;
    responseBody = (await response.text().catch(() => "")).slice(0, 2000);

    if (response.ok) {
      await prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SUCCESS",
          responseStatus: status,
          responseBody,
          deliveredAt: new Date(),
        },
      });
      await prisma.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: { successCount: { increment: 1 }, lastTriggeredAt: new Date() },
      });
      return { ok: true, status: "SUCCESS", responseStatus: status };
    }
  } catch (error) {
    responseBody = error instanceof Error ? error.message : String(error);
  }

  const nextAttempt = delivery.attempt + 1;
  const exhausted = nextAttempt > endpoint.maxRetries;
  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      status: exhausted ? "GIVEN_UP" : "PENDING",
      attempt: nextAttempt,
      responseStatus: status || null,
      responseBody: responseBody.slice(0, 2000),
      nextRetryAt: exhausted
        ? null
        : new Date(Date.now() + endpoint.retryDelay * 1000 * delivery.attempt),
    },
  });
  await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: { failureCount: { increment: 1 }, lastTriggeredAt: new Date() },
  });
  return {
    ok: false,
    status: exhausted ? "GIVEN_UP" : "PENDING",
    responseStatus: status || null,
    error: responseBody || "Webhook delivery failed.",
  };
}

export async function retryWebhookDelivery(
  deliveryId: string,
): Promise<WebhookDeliveryResult> {
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id: deliveryId, tenantId: TENANT_ID },
    select: { id: true, status: true, attempt: true },
  });
  if (!delivery) return { ok: false, status: "NOT_FOUND", error: "Delivery not found." };
  if (delivery.status === "SUCCESS") {
    return { ok: false, status: "SUCCESS", error: "Successful deliveries cannot be retried." };
  }

  await prisma.webhookDelivery.update({
    where: { id: delivery.id },
    data: {
      status: "PENDING",
      nextRetryAt: null,
      responseStatus: null,
      responseBody: null,
      attempt: delivery.status === "GIVEN_UP" ? 1 : delivery.attempt,
    },
  });
  return deliverWebhookDelivery(delivery.id);
}

export async function dispatchPendingWebhooks(limit = 50): Promise<{
  processed: number;
  delivered: number;
  failed: number;
  retried: number;
}> {
  const now = new Date();
  const deliveries = await prisma.webhookDelivery.findMany({
    where: {
      tenantId: TENANT_ID,
      status: "PENDING",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    include: { endpoint: true },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(200, limit)),
  });

  const summary = { processed: 0, delivered: 0, failed: 0, retried: 0 };

  for (const delivery of deliveries) {
    if (!delivery.endpoint?.isActive) continue;
    summary.processed += 1;
    const result = await deliverWebhookDelivery(delivery.id);
    if (result.ok) {
      summary.delivered += 1;
      continue;
    }
    if (result.status === "PENDING") summary.retried += 1;
    summary.failed += 1;
  }

  return summary;
}

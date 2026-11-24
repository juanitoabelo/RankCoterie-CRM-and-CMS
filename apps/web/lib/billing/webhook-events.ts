import type { Prisma } from "@prisma/client";
import { logAudit } from "@/lib/audit";
import { logStructured } from "@/lib/observability";
import { logQuoteMismatch } from "@/lib/checkout/funnel-events";
import { prisma, TENANT_ID } from "@/modules/shared";

const MAX_RECORDED_EVENTS = 25;

export class NonRetryableWebhookError extends Error {}

export async function claimWebhookEvent(orderId: string, eventId: string): Promise<boolean> {
  const current = await prisma.order.findFirst({
    where: { id: orderId, tenantId: TENANT_ID },
    select: { meta: true, updatedAt: true },
  });
  if (!current) return false;

  const meta = (current.meta ?? {}) as Record<string, unknown>;
  const processed = Array.isArray(meta.processedWebhookEvents)
    ? meta.processedWebhookEvents.filter((id): id is string => typeof id === "string")
    : [];
  if (processed.includes(eventId)) {
    logStructured({
      level: "info",
      message: "webhook_event_duplicate",
      context: { orderId, eventId },
    });
    return false;
  }

  const claimed = await prisma.order.updateMany({
    where: { id: orderId, tenantId: TENANT_ID, updatedAt: current.updatedAt },
    data: {
      meta: {
        ...meta,
        processedWebhookEvents: [...processed, eventId].slice(-MAX_RECORDED_EVENTS),
      } as Prisma.InputJsonValue,
    },
  });
  if (claimed.count === 0) {
    logStructured({
      level: "info",
      message: "webhook_event_duplicate",
      context: { orderId, eventId },
    });
    return false;
  }
  return true;
}

export async function logWebhookMismatch(input: {
  gateway: string;
  eventId: string;
  orderId: string;
  reason: string;
  expected: Record<string, unknown>;
  received: Record<string, unknown>;
}): Promise<void> {
  logStructured({
    level: "warn",
    message: "webhook_amount_mismatch",
    context: { ...input },
  });
  logQuoteMismatch({
    orderId: input.orderId,
    gatewayType: input.gateway,
    expectedTotal: typeof input.expected.total === "number" ? input.expected.total : null,
    receivedTotal: typeof input.received.total === "number" ? input.received.total : null,
  });
  await logAudit({
    action: "ORDER_UPDATE",
    entity: "Order",
    entityId: input.orderId,
    reason: `${input.gateway} webhook rejected: ${input.reason}`,
    meta: {
      source: `${input.gateway}-webhook`,
      eventId: input.eventId,
      reason: input.reason,
      expected: input.expected,
      received: input.received,
    },
  }).catch(() => {});
}

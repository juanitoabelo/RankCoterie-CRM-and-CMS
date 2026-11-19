"use server";

import { prisma } from "@/lib/directory/prismaCatalog";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { logAudit } from "@/lib/audit";
import { WEBHOOK_EVENT_CATALOG } from "@/lib/webhooks/events";
import { deliverWebhookDelivery, retryWebhookDelivery } from "@/lib/webhooks/dispatch";

export type ActionResult =
  | { ok: true; id?: string; count?: number }
  | { ok: false; error: string };

export type WebhookDeliveryFilters = {
  status?: string;
  event?: string;
  endpointId?: string;
  limit?: number;
};

function revalidateWebhooks(): void {
  revalidatePath("/admin/webhooks");
  revalidatePath("/admin/webhooks/deliveries");
}

export async function getWebhookEndpoints() {
  await requireSection("webhooks");
  return prisma.webhookEndpoint.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWebhookEndpoint(id: string) {
  await requireSection("webhooks");
  return prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export async function getWebhookDeliveries(filters: WebhookDeliveryFilters = {}) {
  await requireSection("webhooks");
  const take = Math.max(1, Math.min(500, filters.limit ?? 100));
  return prisma.webhookDelivery.findMany({
    where: {
      tenantId: TENANT_ID,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.event ? { event: filters.event } : {}),
      ...(filters.endpointId ? { endpointId: filters.endpointId } : {}),
    },
    include: {
      endpoint: { select: { id: true, name: true, url: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function createWebhookEndpoint(formData: FormData): Promise<ActionResult> {
  const user = await requireSection("webhooks");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : undefined;
  };

  const name = str("name")!;
  const url = str("url")!;
  const events = formData.getAll("events").map(String);
  const isActive = formData.get("isActive") === "on";
  const maxRetries = num("maxRetries") ?? 3;
  const retryDelay = num("retryDelay") ?? 60;

  if (!name || !url || !events.length) {
    return { ok: false, error: "Name, URL, and at least one event are required." };
  }

  try {
    // Generate secret key for HMAC verification
    const secretKey = crypto.randomBytes(32).toString("hex");

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        tenantId: TENANT_ID,
        name,
        url,
        events,
        isActive,
        secret: secretKey,
        secretKey,
        maxRetries,
        retryDelay,
      },
    });
    await logAudit({
      action: "WEBHOOK_ENDPOINT_CREATE",
      entity: "WebhookEndpoint",
      entityId: endpoint.id,
      actorId: user.id,
      reason: `Webhook endpoint "${name}" created`,
      meta: { events },
    }).catch(() => null);
    revalidateWebhooks();
    return { ok: true, id: endpoint.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create webhook endpoint." };
  }
}

export async function updateWebhookEndpoint(id: string, formData: FormData): Promise<ActionResult> {
  const user = await requireSection("webhooks");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const num = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v ? Number(v) : undefined;
  };

  const name = str("name")!;
  const url = str("url")!;
  const events = formData.getAll("events").map(String);
  const isActive = formData.get("isActive") === "on";
  const maxRetries = num("maxRetries") ?? 3;
  const retryDelay = num("retryDelay") ?? 60;

  if (!name || !url || !events.length) {
    return { ok: false, error: "Name, URL, and at least one event are required." };
  }

  const existing = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Webhook endpoint not found." };

  try {
    await prisma.webhookEndpoint.update({
      where: { id, tenantId: TENANT_ID },
      data: {
        name,
        url,
        events,
        isActive,
        maxRetries,
        retryDelay,
      },
    });
    await logAudit({
      action: "WEBHOOK_ENDPOINT_UPDATE",
      entity: "WebhookEndpoint",
      entityId: id,
      actorId: user.id,
      reason: `Webhook endpoint "${name}" updated`,
      meta: { events },
    }).catch(() => null);
    revalidateWebhooks();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update webhook endpoint." };
  }
}

export async function deleteWebhookEndpoint(id: string): Promise<ActionResult> {
  const user = await requireSection("webhooks");
  try {
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (!existing) return { ok: false, error: "Webhook endpoint not found." };
    await prisma.webhookEndpoint.delete({ where: { id, tenantId: TENANT_ID } });
    await logAudit({
      action: "WEBHOOK_ENDPOINT_DELETE",
      entity: "WebhookEndpoint",
      entityId: id,
      actorId: user.id,
      reason: "Webhook endpoint deleted",
    }).catch(() => null);
    revalidateWebhooks();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete webhook endpoint." };
  }
}

export async function retryWebhookDeliveryAction(id: string): Promise<ActionResult> {
  const user = await requireSection("webhooks");
  const delivery = await prisma.webhookDelivery.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true, event: true, endpointId: true },
  });
  if (!delivery) return { ok: false, error: "Webhook delivery not found." };
  const result = await retryWebhookDelivery(id);
  if (result.status === "NOT_FOUND") return { ok: false, error: "Webhook delivery not found." };
  if (result.status === "SUCCESS") {
    return { ok: false, error: "Successful deliveries cannot be retried." };
  }
  await logAudit({
    action: "WEBHOOK_DELIVERY_RETRY",
    entity: "WebhookDelivery",
    entityId: id,
    actorId: user.id,
    reason: `Retried webhook delivery for ${delivery.event}`,
    meta: { status: result.status, responseStatus: result.responseStatus ?? null },
  }).catch(() => null);
  revalidateWebhooks();
  revalidatePath(`/admin/webhooks/${delivery.endpointId}`);
  return { ok: true, id };
}

export async function retryWebhookDeliveriesBulk(ids: string[]): Promise<ActionResult> {
  const user = await requireSection("webhooks");
  const uniqueIds = [...new Set(ids.filter((id) => typeof id === "string" && id))].slice(0, 100);
  if (!uniqueIds.length) return { ok: false, error: "Select at least one delivery." };
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { id: { in: uniqueIds }, tenantId: TENANT_ID },
    select: { id: true },
  });
  let count = 0;
  for (const delivery of deliveries) {
    const result = await retryWebhookDelivery(delivery.id);
    if (result.status === "NOT_FOUND" || result.status === "SUCCESS") continue;
    await logAudit({
      action: "WEBHOOK_DELIVERY_RETRY",
      entity: "WebhookDelivery",
      entityId: delivery.id,
      actorId: user.id,
      reason: "Webhook delivery retried in bulk",
      meta: { status: result.status },
    }).catch(() => null);
    count += 1;
  }
  revalidateWebhooks();
  return count ? { ok: true, count } : { ok: false, error: "No deliveries were retried." };
}

export async function testWebhookEndpoint(id: string): Promise<ActionResult> {
  const user = await requireSection("webhooks");
  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id, tenantId: TENANT_ID },
    select: { id: true, events: true },
  });
  if (!endpoint) return { ok: false, error: "Webhook endpoint not found." };
  const delivery = await prisma.webhookDelivery.create({
    data: {
      tenantId: TENANT_ID,
      endpointId: endpoint.id,
      event: endpoint.events[0] ?? "lead.created",
      payload: { test: true, endpointId: endpoint.id },
      attempt: 1,
      status: "PENDING",
    },
  });
  const result = await deliverWebhookDelivery(delivery.id);
  await logAudit({
    action: "WEBHOOK_DELIVERY_TEST",
    entity: "WebhookDelivery",
    entityId: delivery.id,
    actorId: user.id,
    reason: `Test webhook sent to endpoint ${endpoint.id}`,
    meta: { status: result.status, responseStatus: result.responseStatus ?? null },
  }).catch(() => null);
  revalidateWebhooks();
  revalidatePath(`/admin/webhooks/${endpoint.id}`);
  return result.ok
    ? { ok: true, id: delivery.id }
    : { ok: false, error: result.error ?? "Test delivery failed." };
}

export async function getWebhookEvents() {
  return WEBHOOK_EVENT_CATALOG;
}

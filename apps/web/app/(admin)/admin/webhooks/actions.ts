"use server";

import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/lib/tenant";
import crypto from "crypto";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

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
  return prisma.webhookEndpoint.findUnique({
    where: { id, tenantId: TENANT_ID },
    include: {
      deliveries: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function createWebhookEndpoint(formData: FormData): Promise<ActionResult> {
  await requireSection("webhooks");
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
        secretKey,
        maxRetries,
        retryDelay,
      },
    });

    return { ok: true, id: endpoint.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create webhook endpoint." };
  }
}

export async function updateWebhookEndpoint(id: string, formData: FormData): Promise<ActionResult> {
  await requireSection("webhooks");
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

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update webhook endpoint." };
  }
}

export async function deleteWebhookEndpoint(id: string): Promise<ActionResult> {
  await requireSection("webhooks");
  try {
    await prisma.webhookEndpoint.delete({ where: { id, tenantId: TENANT_ID } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete webhook endpoint." };
  }
}

export async function getWebhookEvents() {
  return [
    { value: "lead.created", label: "Lead Created" },
    { value: "lead.updated", label: "Lead Updated" },
    { value: "order.paid", label: "Order Paid" },
    { value: "order.refunded", label: "Order Refunded" },
    { value: "listing.created", label: "Listing Created" },
    { value: "listing.updated", label: "Listing Updated" },
    { value: "payment.failed", label: "Payment Failed" },
    { value: "subscription.cancelled", label: "Subscription Cancelled" },
  ];
}
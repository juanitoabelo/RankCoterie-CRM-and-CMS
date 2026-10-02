"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import { GATEWAY_FIELDS } from "@/components/admin/product/gatewayFields";

export type ActionResult = { ok: true } | { ok: false; error: string };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Build the JSON config from the field definitions so new fields save automatically. */
function buildConfig(type: string, formData: FormData): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const field of GATEWAY_FIELDS[type] ?? []) {
    if (field.checkbox || field.type === "checkbox") {
      out[field.name] = formData.get(field.name) === "on";
    } else {
      out[field.name] = String(formData.get(field.name) ?? "").trim();
    }
  }
  return out;
}

export async function createPaymentGateway(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("products");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "STRIPE").trim();
  const isEnabled = formData.get("isEnabled") === "on";

  if (!name) return { ok: false, error: "Name is required." };

  try {
    const slug = slugify(name);
    const existing = await prisma.paymentGateway.findFirst({
      where: { tenantId: TENANT_ID, slug },
    });
    if (existing) return { ok: false, error: "A payment gateway with that slug already exists." };

    await prisma.paymentGateway.create({
      data: {
        tenantId: TENANT_ID,
        name,
        slug,
        type: type as "STRIPE" | "PAYPAL" | "SQUARE" | "MANUAL",
        isEnabled,
        config: buildConfig(type, formData),
      },
    });
    await logAudit({ action: "PAYMENT_GATEWAY_CREATE", entity: "PaymentGateway", entityId: slug, meta: { name, type }, actorId: actor.id });
    revalidatePath("/admin/products/payment-gateway");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create payment gateway." };
  }
}

export async function updatePaymentGateway(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("products");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "STRIPE").trim();
  const isEnabled = formData.get("isEnabled") === "on";

  if (!name) return { ok: false, error: "Name is required." };

  try {
    const slug = slugify(name);
    const clash = await prisma.paymentGateway.findFirst({
      where: { tenantId: TENANT_ID, slug, NOT: { id } },
    });
    if (clash) return { ok: false, error: "A payment gateway with that slug already exists." };

    await prisma.paymentGateway.update({
      where: { id },
      data: {
        name,
        slug,
        type: type as "STRIPE" | "PAYPAL" | "SQUARE" | "MANUAL",
        isEnabled,
        config: buildConfig(type, formData),
      },
    });
    await logAudit({ action: "PAYMENT_GATEWAY_UPDATE", entity: "PaymentGateway", entityId: id, meta: { name, type }, actorId: actor.id });
    revalidatePath("/admin/products/payment-gateway");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update payment gateway." };
  }
}

export async function deletePaymentGateway(id: string): Promise<ActionResult> {
  await requireSection("products");
  try {
    await prisma.paymentGateway.delete({ where: { id } });
    await logAudit({ action: "PAYMENT_GATEWAY_DELETE", entity: "PaymentGateway", entityId: id });
    revalidatePath("/admin/products/payment-gateway");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete payment gateway." };
  }
}

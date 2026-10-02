"use server";

import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

function readRateInput(formData: FormData) {
  const rateRaw = String(formData.get("rate") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();
  const rate = rateRaw ? Number(rateRaw) : NaN;
  const priority = priorityRaw ? Number(priorityRaw) : 0;
  return {
    name: String(formData.get("name") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim() || null,
    rate: Number.isFinite(rate) ? rate : NaN,
    priority: Number.isFinite(priority) ? Math.trunc(priority) : 0,
  };
}

export async function createTaxRate(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("products");
  const input = readRateInput(formData);

  if (!input.country) return { ok: false, error: "Country is required." };
  if (!Number.isFinite(input.rate) || input.rate < 0) {
    return { ok: false, error: "Rate must be a number (percent, e.g. 8.25)." };
  }

  try {
    await prisma.taxRate.create({
      data: {
        tenantId: TENANT_ID,
        name: input.name,
        country: input.country,
        state: input.state,
        rate: input.rate,
        priority: input.priority,
      },
    });
    await logAudit({
      action: "TAX_RATE_CREATE",
      entity: "TaxRate",
      entityId: `${input.country}/${input.state ?? "*"}`,
      meta: { country: input.country, state: input.state, rate: input.rate },
      actorId: actor.id,
    });
    revalidatePath("/admin/tax");
    revalidatePath("/checkout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create tax rate." };
  }
}

export async function updateTaxRate(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("products");
  const input = readRateInput(formData);

  if (!input.country) return { ok: false, error: "Country is required." };
  if (!Number.isFinite(input.rate) || input.rate < 0) {
    return { ok: false, error: "Rate must be a number (percent, e.g. 8.25)." };
  }

  try {
    const existing = await prisma.taxRate.findFirst({ where: { id, tenantId: TENANT_ID } });
    if (!existing) return { ok: false, error: "Tax rate not found." };

    await prisma.taxRate.update({
      where: { id },
      data: {
        name: input.name,
        country: input.country,
        state: input.state,
        rate: input.rate,
        priority: input.priority,
      },
    });
    await logAudit({
      action: "TAX_RATE_UPDATE",
      entity: "TaxRate",
      entityId: id,
      meta: { country: input.country, state: input.state, rate: input.rate },
      actorId: actor.id,
    });
    revalidatePath("/admin/tax");
    revalidatePath("/admin/tax/" + id);
    revalidatePath("/checkout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update tax rate." };
  }
}

export async function deleteTaxRate(id: string): Promise<ActionResult> {
  const actor = await requireSection("products");
  try {
    const existing = await prisma.taxRate.findFirst({ where: { id, tenantId: TENANT_ID } });
    if (!existing) return { ok: false, error: "Tax rate not found." };

    await prisma.taxRate.delete({ where: { id } });
    await logAudit({
      action: "TAX_RATE_DELETE",
      entity: "TaxRate",
      entityId: id,
      meta: { country: existing.country, state: existing.state, rate: existing.rate },
      actorId: actor.id,
    });
    revalidatePath("/admin/tax");
    revalidatePath("/checkout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete tax rate." };
  }
}

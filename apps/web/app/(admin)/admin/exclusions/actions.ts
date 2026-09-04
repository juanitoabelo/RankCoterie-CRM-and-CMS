"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function addExclusion(formData: FormData): Promise<ActionResult> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const domainKey = String(formData.get("domainKey") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  if (!companyName) return { ok: false, error: "Company name is required." };

  try {
    const row = await prisma.excludedCompany.create({
      data: {
        tenantId: TENANT_ID,
        companyName,
        domainKey,
        reason,
        isActive: true,
      },
    });
    await logAudit({
      action: "SUPPRESS_ADD",
      entity: "ExcludedCompany",
      entityId: row.id,
      reason,
      meta: { companyName, domainKey },
    });
    revalidatePath("/admin/exclusions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to add exclusion." };
  }
}

export async function deactivateExclusion(id: string, reason?: string): Promise<ActionResult> {
  try {
    const row = await prisma.excludedCompany.update({
      where: { id },
      data: { isActive: false },
    });
    await logAudit({
      action: "SUPPRESS_REMOVE",
      entity: "ExcludedCompany",
      entityId: row.id,
      reason: reason ?? null,
      meta: { companyName: row.companyName },
    });
    revalidatePath("/admin/exclusions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to remove exclusion." };
  }
}

// Form-action wrappers: Next 16 <form action> requires (FormData) => void | Promise<void>.
export async function addExclusionForm(formData: FormData): Promise<void> {
  await addExclusion(formData);
}

export async function deactivateExclusionForm(id: string, _formData: FormData): Promise<void> {
  await deactivateExclusion(id);
}
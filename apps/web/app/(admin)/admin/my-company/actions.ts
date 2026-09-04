"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/lib/admin-auth";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function getCompany() {
  await requireSection("myCompany");
  return prisma.company.findUnique({ where: { tenantId: TENANT_ID } });
}

export async function saveCompany(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("myCompany");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const name = str("name");
  if (!name) return { ok: false, error: "Company name is required." };

  const data = {
    name,
    ga4: str("ga4") || null,
    gtm: str("gtm") || null,
    fbPixel: str("fbPixel") || null,
    searchConsole: str("searchConsole") || null,
    gscVerificationTag: str("gscVerificationTag") || null,
    brandColor: str("brandColor") || null,
    logoAssetId: str("logoAssetId") || null,
  };

  try {
    if (data.logoAssetId) {
      const asset = await prisma.asset.findFirst({ where: { id: data.logoAssetId, tenantId: TENANT_ID } });
      if (!asset) return { ok: false, error: "Logo asset not found for this tenant." };
    }
    await prisma.company.upsert({
      where: { tenantId: TENANT_ID },
      update: data,
      create: { tenantId: TENANT_ID, ...data },
    });
    await logAudit({ action: "COMPANY_UPDATE", entity: "Company", entityId: TENANT_ID, actorId: actor.id });
    revalidatePath("/admin/my-company");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save company." };
  }
}

export async function saveCompanyForm(formData: FormData): Promise<void> {
  await saveCompany(formData);
}

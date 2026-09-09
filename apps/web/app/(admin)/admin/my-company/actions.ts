"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function getCompany() {
  await requireSection("myCompany");
  return prisma.company.findUnique({ where: { tenantId: TENANT_ID } });
}

export async function saveCompanyInfo(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("myCompany");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const name = str("name");
  if (!name) return { ok: false, error: "Company name is required." };

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const businessHours: Record<string, { opens: string; closes: string }> = {};
  for (const day of dayNames) {
    businessHours[day] = {
      opens: str(`${day}_opens`),
      closes: str(`${day}_closes`),
    };
  }

  const data = {
    name,
    tagline: str("tagline") || null,
    description: str("description") || null,
    businessHours,
    industryCategory: str("industryCategory") || null,
    industrySubCategory: str("industrySubCategory") || null,
    industrySubSubCategory: str("industrySubSubCategory") || null,
    audiencePersona1: str("audiencePersona1") || null,
    audiencePersona2: str("audiencePersona2") || null,
    audiencePersona3: str("audiencePersona3") || null,
    languagesSpoken: str("languagesSpoken") || null,
    additionalLanguage: str("additionalLanguage") || null,
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
    await logAudit({ action: "COMPANY_INFO_UPDATE", entity: "Company", entityId: TENANT_ID, actorId: actor.id });
    revalidatePath("/admin/my-company");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save company info." };
  }
}

export async function saveCompanyInfoForm(formData: FormData): Promise<void> {
  await saveCompanyInfo(formData);
}

export async function saveContactInfo(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("myCompany");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const contactInfo = {
    phone: str("phone"),
    phoneLink: str("phoneLink"),
    additionalPhone: str("additionalPhone"),
    fax: str("fax"),
    email: str("email"),
    address: str("address"),
    city: str("city"),
    state: str("state"),
    zip: str("zip"),
    country: str("country"),
    mapLinkUrl: str("mapLinkUrl"),
    mapEmbedUrl: str("mapEmbedUrl"),
  };

  try {
    await prisma.company.upsert({
      where: { tenantId: TENANT_ID },
      update: { contactInfo },
      create: { tenantId: TENANT_ID, name: "Company", contactInfo },
    });
    await logAudit({ action: "COMPANY_CONTACT_INFO_UPDATE", entity: "Company", entityId: TENANT_ID, actorId: actor.id });
    revalidatePath("/admin/my-company");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save contact info." };
  }
}

export async function saveContactInfoForm(formData: FormData): Promise<void> {
  await saveContactInfo(formData);
}

export async function saveSocialMedia(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("myCompany");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const socialMedia = {
    facebook: str("facebook"),
    twitter: str("twitter"),
    youtube: str("youtube"),
    instagram: str("instagram"),
    linkedin: str("linkedin"),
    pinterest: str("pinterest"),
  };

  try {
    await prisma.company.upsert({
      where: { tenantId: TENANT_ID },
      update: { socialMedia },
      create: { tenantId: TENANT_ID, name: "Company", socialMedia },
    });
    await logAudit({ action: "COMPANY_SOCIAL_MEDIA_UPDATE", entity: "Company", entityId: TENANT_ID, actorId: actor.id });
    revalidatePath("/admin/my-company");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save social media." };
  }
}

export async function saveSocialMediaForm(formData: FormData): Promise<void> {
  await saveSocialMedia(formData);
}

export async function saveTracking(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("myCompany");
  const str = (k: string) => String(formData.get(k) ?? "").trim() || null;

  const data = {
    ga4: str("ga4"),
    gtm: str("gtm"),
    fbPixel: str("fbPixel"),
    searchConsole: str("searchConsole"),
    gscVerificationTag: str("gscVerificationTag"),
  };

  try {
    await prisma.company.upsert({
      where: { tenantId: TENANT_ID },
      update: data,
      create: { tenantId: TENANT_ID, name: "Company", ...data },
    });
    await logAudit({ action: "COMPANY_TRACKING_UPDATE", entity: "Company", entityId: TENANT_ID, actorId: actor.id });
    revalidatePath("/admin/my-company");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save tracking." };
  }
}

export async function saveTrackingForm(formData: FormData): Promise<void> {
  await saveTracking(formData);
}

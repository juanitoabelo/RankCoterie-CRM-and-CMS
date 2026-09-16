"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import type { ReadingSettings, PageOption, ActionResult } from "./types";
import { DEFAULT_READING_SETTINGS } from "./types";

/** Read the tenant's reading settings. */
export async function getReadingSettings(): Promise<ReadingSettings> {
  await requireSection("reading");
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as { readingSettings?: Partial<ReadingSettings> };
  return { ...DEFAULT_READING_SETTINGS, ...theme.readingSettings };
}

/** Fetch all pages for the dropdowns. */
export async function getReadingPages(): Promise<PageOption[]> {
  await requireSection("reading");
  return prisma.page.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, title: true, status: true },
  });
}

/** Save reading settings. */
export async function saveReadingSettings(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("reading");
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string, fallback: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) && v >= 1 ? v : fallback;
  };

  const homepageDisplays = str("homepageDisplays") as "latest" | "static";
  const homepagePageId = str("homepagePageId") || null;
  const postsPageId = str("postsPageId") || null;

  // Update the Page.isHomepage flag
  await prisma.page.updateMany({
    where: { tenantId: TENANT_ID, isHomepage: true },
    data: { isHomepage: false },
  });
  if (homepageDisplays === "static" && homepagePageId) {
    await prisma.page.update({
      where: { id: homepagePageId },
      data: { isHomepage: true },
    });
  }

  const settings: ReadingSettings = {
    homepageDisplays,
    homepagePageId,
    postsPageId,
    postsPerPage: num("postsPerPage", 10),
    feedsPerPage: num("feedsPerPage", 10),
    feedFormat: (str("feedFormat") as "full" | "excerpt") || "full",
    searchEngineVisibility: (str("searchEngineVisibility") as "visible" | "hidden") || "visible",
  };

  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: "Canopy", domainKey: "canopy.local" },
    });
    const theme = (tenant.theme ?? {}) as Record<string, unknown>;
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: {
          ...theme,
          readingSettings: settings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({
      action: "READING_SETTINGS_UPDATE",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    revalidatePath("/admin/reading");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save reading settings.",
    };
  }
}

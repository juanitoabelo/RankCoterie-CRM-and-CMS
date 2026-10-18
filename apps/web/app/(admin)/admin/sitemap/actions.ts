"use server";

import { revalidatePath } from "next/cache";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";

export type SitemapActionResult = { ok: true } | { ok: false; error: string };

/**
 * Force the sitemap (and robots.txt) to regenerate now instead of waiting for
 * the hourly revalidate window. The metadata routes are cached, so we invalidate
 * their paths and let the next request rebuild them from fresh data.
 */
export async function regenerateSitemap(): Promise<SitemapActionResult> {
  const actor = await requireSection("sitemap");
  try {
    revalidatePath("/sitemap.xml");
    revalidatePath("/robots.txt");
    revalidatePath("/admin/sitemap");
    await logAudit({
      action: "SITEMAP_REGENERATE",
      entity: "Sitemap",
      entityId: "sitemap.xml",
      actorId: actor.id,
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to regenerate sitemap.",
    };
  }
}

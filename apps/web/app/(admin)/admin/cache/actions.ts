"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { clearApplicationCaches } from "@/lib/cache-purge";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";

export async function clearAllCaches() {
  try {
    const actor = await requireSection("general");
    clearApplicationCaches();
    revalidatePath("/", "layout");
    await logAudit({
      action: "CACHE_CLEAR",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Failed to clear caches.",
    };
  }
}

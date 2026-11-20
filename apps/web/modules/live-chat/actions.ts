"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { requireCrmAdmin } from "@/modules/crm/access";
import { prisma, TENANT_ID } from "@/modules/shared";
import { normalizeLiveChatSettings, validateLiveChatSettings } from "./settings-helpers";

export async function saveLiveChatSettings(formData: FormData): Promise<void> {
  const { user: actor } = await requireCrmAdmin();
  const settings = normalizeLiveChatSettings({
    enabled: formData.get("enabled") === "on",
    title: String(formData.get("title") ?? ""),
    greeting: String(formData.get("greeting") ?? ""),
    position: String(formData.get("position") ?? "bottom-right"),
    accentColor: String(formData.get("accentColor") ?? ""),
    leadSource: String(formData.get("leadSource") ?? ""),
  });
  const errors = validateLiveChatSettings(settings);
  if (errors.length > 0) {
    redirect(`/admin/live-chat?error=${encodeURIComponent(errors[0])}`);
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID }, select: { theme: true } });
  const theme = (tenant?.theme ?? {}) as Record<string, unknown>;
  await prisma.tenant.update({
    where: { id: TENANT_ID },
    data: {
      theme: {
        ...theme,
        liveChat: settings,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  await logAudit({
    action: "LIVE_CHAT_SETTINGS_UPDATE",
    entity: "Tenant",
    entityId: TENANT_ID,
    actorId: actor.id,
  });
  revalidatePath("/admin/live-chat");
  revalidatePath("/");
  redirect("/admin/live-chat?ok=Live%20chat%20settings%20saved.");
}

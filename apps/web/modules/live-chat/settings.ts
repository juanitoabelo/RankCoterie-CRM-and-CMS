import { prisma, TENANT_ID } from "@/modules/shared";
import { normalizeLiveChatSettings } from "./settings-helpers";

export async function getLiveChatSettings() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: TENANT_ID },
    select: { theme: true },
  });
  const theme = (tenant?.theme ?? {}) as Record<string, unknown>;
  return normalizeLiveChatSettings(theme.liveChat);
}

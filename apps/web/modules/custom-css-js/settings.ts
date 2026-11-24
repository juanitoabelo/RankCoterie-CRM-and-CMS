import { prisma, TENANT_ID } from "@/modules/shared";
import { DEFAULT_CUSTOM_CSS_JS, type CustomCssJsSettings } from "./types";

export async function readPublicCustomCssJsSettings(): Promise<CustomCssJsSettings> {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const theme = (tenant?.theme ?? {}) as {
    customCssJs?: Partial<CustomCssJsSettings>;
  };
  return { ...DEFAULT_CUSTOM_CSS_JS, ...theme.customCssJs };
}

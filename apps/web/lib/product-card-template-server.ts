import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import { normalizeProductCardTemplate } from "./product-card-template";

export async function getProductCardTemplateSettings() {
  const tenant = await prisma.tenant.findUnique({
    where: { id: TENANT_ID },
    select: { theme: true },
  });
  const theme = tenant?.theme && typeof tenant.theme === "object" && !Array.isArray(tenant.theme)
    ? tenant.theme as Record<string, unknown>
    : {};
  return normalizeProductCardTemplate(theme.productCardTemplate);
}

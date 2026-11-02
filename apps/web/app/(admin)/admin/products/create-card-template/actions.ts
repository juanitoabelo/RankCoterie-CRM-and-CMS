"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import {
  normalizeProductCardTemplate,
  type ProductCardTemplateSettings,
} from "@/lib/product-card-template";

export type ProductCardTemplateActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveProductCardTemplate(
  submitted: ProductCardTemplateSettings,
): Promise<ProductCardTemplateActionResult> {
  const actor = await requireSection("products");
  const settings = normalizeProductCardTemplate(submitted);

  try {
    const tenant = await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      update: {},
      create: { id: TENANT_ID, name: "Rank Coterie", domainKey: "canopy.local" },
    });
    const theme = tenant.theme && typeof tenant.theme === "object" && !Array.isArray(tenant.theme)
      ? tenant.theme as Record<string, unknown>
      : {};
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        theme: {
          ...theme,
          productCardTemplate: settings,
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await logAudit({
      action: "PRODUCT_CARD_TEMPLATE_UPDATE",
      entity: "Tenant",
      entityId: TENANT_ID,
      actorId: actor.id,
    });
    revalidatePath("/admin/products/create-card-template");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not save product card template.",
    };
  }
}

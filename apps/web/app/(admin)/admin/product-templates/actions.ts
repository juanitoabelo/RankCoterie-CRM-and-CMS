"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { prisma, TENANT_ID } from "@/modules/shared";
import {
  createProductTemplate,
  deleteProductTemplate,
  getProductTemplate,
  listProductTemplateRevisions,
  restoreProductTemplateRevision,
  saveProductTemplateAssignments,
  setDefaultProductTemplate,
  snapshotProductTemplateRevision,
  updateProductTemplateData,
} from "@/modules/product-template/queries";

export type ProductTemplateActionResult = { ok: true } | { ok: false; error: string };
export type ProductTemplateSaveResult = ProductTemplateActionResult & { data?: string };

export async function createProductTemplateAction(
  name: string,
): Promise<ProductTemplateActionResult & { id?: string }> {
  const actor = await requireSection("products");
  try {
    const trimmedName = name.trim();
    if (!trimmedName) return { ok: false, error: "Enter a template name." };
    const template = await createProductTemplate(trimmedName, "single");
    await logAudit({
      action: "PRODUCT_TEMPLATE_CREATE",
      entity: "ProductTemplate",
      entityId: template.id,
      actorId: actor.id,
      reason: `Created product template: ${trimmedName}`,
    });
    revalidatePath("/admin/product-templates");
    return { ok: true, id: template.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create product template." };
  }
}

export async function saveProductTemplateAction(
  id: string,
  data: string,
  options: { createRevision?: boolean } = {},
): Promise<ProductTemplateSaveResult> {
  const actor = await requireSection("products");
  try {
    const template = await getProductTemplate(id);
    if (!template) return { ok: false, error: "Product template not found." };
    await updateProductTemplateData(id, data);
    if (options.createRevision) await snapshotProductTemplateRevision(id, data);
    await logAudit({
      action: "PRODUCT_TEMPLATE_UPDATE",
      entity: "ProductTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/product-templates/${id}`);
    revalidatePath("/");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save product template." };
  }
}

export async function listProductTemplateRevisionsAction(id: string) {
  await requireSection("products");
  if (!await getProductTemplate(id)) throw new Error("Product template not found.");
  return listProductTemplateRevisions(id);
}

export async function saveProductTemplateAssignmentsAction(
  id: string,
  formData: FormData,
): Promise<ProductTemplateActionResult> {
  const actor = await requireSection("products");
  try {
    const template = await getProductTemplate(id);
    if (!template) return { ok: false, error: "Product template not found." };
    const productIds = [...new Set(formData.getAll("productId").map((value) => String(value).trim()).filter(Boolean))];
    if (productIds.length > 0) {
      const ownedProducts = await prisma.product.findMany({
        where: { tenantId: TENANT_ID, id: { in: productIds } },
        select: { id: true },
      });
      if (ownedProducts.length !== productIds.length) {
        return { ok: false, error: "One or more selected products could not be found." };
      }
    }
    await saveProductTemplateAssignments(id, productIds.map((pageId, priority) => ({
      pageId,
      pageType: null,
      priority: productIds.length - priority,
    })));
    await logAudit({
      action: "PRODUCT_TEMPLATE_ASSIGNMENTS_UPDATE",
      entity: "ProductTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/product-templates/${id}`);
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save product assignments." };
  }
}

export async function restoreProductTemplateRevisionAction(
  id: string,
  revisionId: string,
): Promise<ProductTemplateSaveResult> {
  const actor = await requireSection("products");
  try {
    if (!await getProductTemplate(id)) return { ok: false, error: "Product template not found." };
    const data = await restoreProductTemplateRevision(id, revisionId);
    if (!data) return { ok: false, error: "Version not found." };
    await logAudit({
      action: "PRODUCT_TEMPLATE_RESTORE",
      entity: "ProductTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath(`/admin/product-templates/${id}`);
    revalidatePath("/");
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to restore version." };
  }
}

export async function setDefaultProductTemplateAction(id: string): Promise<ProductTemplateActionResult> {
  const actor = await requireSection("products");
  try {
    const template = await getProductTemplate(id);
    if (!template) return { ok: false, error: "Product template not found." };
    await setDefaultProductTemplate(id);
    await logAudit({
      action: "PRODUCT_TEMPLATE_SET_DEFAULT",
      entity: "ProductTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/product-templates");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to set default template." };
  }
}

export async function deleteProductTemplateAction(id: string): Promise<ProductTemplateActionResult> {
  const actor = await requireSection("products");
  try {
    const template = await getProductTemplate(id);
    if (!template) return { ok: false, error: "Product template not found." };
    await deleteProductTemplate(id);
    await logAudit({
      action: "PRODUCT_TEMPLATE_DELETE",
      entity: "ProductTemplate",
      entityId: id,
      actorId: actor.id,
    });
    revalidatePath("/admin/product-templates");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to delete product template." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import {
  parseProductFormData,
  slugify,
  type ParsedRelations,
} from "@/modules/ecommerce/product-form";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(message: string): ActionResult {
  return { ok: false, error: message };
}

function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/** Keep only ids that belong to this tenant (never trust posted ids). */
async function validCategoryIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.productCategory.findMany({
    where: { tenantId: TENANT_ID, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function validTagIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.productTag.findMany({
    where: { tenantId: TENANT_ID, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function validAttributeIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.productAttribute.findMany({
    where: { tenantId: TENANT_ID, id: { in: ids } },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Resolve a unique slug, appending -2, -3… when the base is taken. */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const seed = slugify(base) || "product";
  let candidate = seed;
  for (let i = 2; i < 100; i += 1) {
    const existing = await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${seed}-${i}`;
  }
  return `${seed}-${Date.now()}`;
}

async function syncProductRelations(
  tx: Prisma.TransactionClient,
  productId: string,
  relations: ParsedRelations,
  currentMainAssetId: string | null,
): Promise<void> {
  const categoryIds = await validCategoryIds(relations.categoryIds);
  const tagIds = await validTagIds(relations.tagIds);
  const attributeIds = new Set(await validAttributeIds(relations.attributeValues.map((v) => v.attributeId)));

  await tx.productCategoryLink.deleteMany({ where: { productId } });
  if (categoryIds.length > 0) {
    await tx.productCategoryLink.createMany({
      data: categoryIds.map((categoryId, index) => ({
        productId,
        categoryId,
        isPrimary: categoryId === relations.primaryCategoryId,
        position: index,
      })),
    });
  }

  await tx.productTagLink.deleteMany({ where: { productId } });
  if (tagIds.length > 0) {
    await tx.productTagLink.createMany({
      data: tagIds.map((tagId) => ({ productId, tagId })),
    });
  }

  await tx.productAttributeValue.deleteMany({ where: { productId } });
  const attributeValues = relations.attributeValues.filter((v) => attributeIds.has(v.attributeId));
  if (attributeValues.length > 0) {
    await tx.productAttributeValue.createMany({
      data: attributeValues.map((value) => ({ ...value, productId })),
    });
  }

  if (relations.imageAssetId && relations.imageAssetId !== currentMainAssetId) {
    const asset = await tx.asset.findFirst({
      where: { id: relations.imageAssetId, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (asset) {
      await tx.productImage.updateMany({
        where: { productId, isMain: true },
        data: { isMain: false },
      });
      await tx.productImage.create({
        data: { productId, assetId: asset.id, isMain: true, position: 0 },
      });
    }
  }
}

async function mainImageAssetId(productId: string): Promise<string | null> {
  const image = await prisma.productImage.findFirst({
    where: { productId, isMain: true },
    select: { assetId: true },
  });
  return image?.assetId ?? null;
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Product name is required.");

    const { data, relations } = parseProductFormData(formData);
    if (!data.slug) data.slug = await uniqueSlug(name);

    const duplicate = await prisma.product.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (duplicate) return fail(`Slug "${data.slug}" is already taken.`);

    const now = new Date();
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...data,
          tenantId: TENANT_ID,
          price: data.price,
          publishedAt: data.status === "PUBLISHED" ? now : null,
        },
      });
      await syncProductRelations(tx, created.id, relations, null);
      return created;
    });

    await logAudit({
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: product.id,
      meta: { name, slug: product.slug, type: product.type },
    });

    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create product."));
  }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, slug: true, status: true, publishedAt: true },
    });
    if (!existing) return fail("Product not found.");

    const { data, relations } = parseProductFormData(formData);

    if (!data.slug) data.slug = await uniqueSlug(data.name || existing.slug, existing.id);

    if (data.slug !== existing.slug) {
      const duplicate = await prisma.product.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (duplicate) return fail(`Slug "${data.slug}" is already taken.`);
    }

    const currentMain = await mainImageAssetId(existing.id);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          ...data,
          publishedAt: existing.publishedAt ?? (data.status === "PUBLISHED" ? new Date() : null),
        },
      });
      await syncProductRelations(tx, existing.id, relations, currentMain);
    });

    await logAudit({
      action: "PRODUCT_UPDATE",
      entity: "Product",
      entityId: existing.id,
      meta: { name: data.name, slug: data.slug },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${existing.id}`);
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to update product."));
  }
}

/** Single entry point for the product form: routes on a hidden `id` field. */
export async function saveProduct(formData: FormData): Promise<ActionResult> {
  const id = formData.get("id");
  return typeof id === "string" && id !== "" ? updateProduct(id, formData) : createProduct(formData);
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, name: true, slug: true },
    });
    if (!existing) return fail("Product not found.");

    await prisma.product.delete({ where: { id: existing.id } });

    await logAudit({
      action: "PRODUCT_DELETE",
      entity: "Product",
      entityId: existing.id,
      meta: { name: existing.name, slug: existing.slug },
    });

    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to delete product."));
  }
}

// ============================================================================
// Product category management
// ============================================================================

export async function createProductCategory(formData: FormData): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Category name is required.");

    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugInput ? slugify(slugInput) : slugify(name);
    if (!slug) return fail("Category slug is invalid.");

    const existing = await prisma.productCategory.findUnique({ where: { slug }, select: { id: true } });
    if (existing) return fail(`Slug "${slug}" is already taken.`);

    const parentRaw = String(formData.get("parentId") ?? "").trim();
    const parentId = parentRaw
      ? await prisma.productCategory
          .findFirst({ where: { id: parentRaw, tenantId: TENANT_ID }, select: { id: true } })
          .then((row) => row?.id ?? null)
      : null;

    await prisma.productCategory.create({
      data: {
        tenantId: TENANT_ID,
        name,
        slug,
        description: String(formData.get("description") ?? "").trim() || null,
        parentId,
        menuOrder: Number.parseInt(String(formData.get("menuOrder") ?? "0"), 10) || 0,
        isActive: formData.get("isActive") === "on",
        showInMenu: formData.get("showInMenu") === "on",
      },
    });

    await logAudit({ action: "CATEGORY_CREATE", entity: "ProductCategory", entityId: slug, meta: { name, slug } });

    revalidatePath("/admin/products/categories");
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create category."));
  }
}

export async function deleteProductCategory(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.productCategory.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, name: true, slug: true },
    });
    if (!existing) return fail("Category not found.");

    await prisma.productCategory.delete({ where: { id: existing.id } });

    await logAudit({ action: "CATEGORY_DELETE", entity: "ProductCategory", entityId: existing.id, meta: { name: existing.name } });

    revalidatePath("/admin/products/categories");
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to delete category."));
  }
}

// ============================================================================
// Product tag management
// ============================================================================

export async function createProductTag(formData: FormData): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Tag name is required.");

    const slugInput = String(formData.get("slug") ?? "").trim();
    const slug = slugInput ? slugify(slugInput) : slugify(name);
    if (!slug) return fail("Tag slug is invalid.");

    const existing = await prisma.productTag.findFirst({
      where: { tenantId: TENANT_ID, slug },
      select: { id: true },
    });
    if (existing) return fail(`Slug "${slug}" is already taken.`);

    await prisma.productTag.create({ data: { tenantId: TENANT_ID, name, slug } });

    await logAudit({ action: "CATEGORY_CREATE", entity: "ProductTag", entityId: slug, meta: { name, slug } });

    revalidatePath("/admin/products/tags");
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create tag."));
  }
}

export async function deleteProductTag(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.productTag.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, name: true },
    });
    if (!existing) return fail("Tag not found.");

    await prisma.productTag.delete({ where: { id: existing.id } });

    await logAudit({ action: "CATEGORY_DELETE", entity: "ProductTag", entityId: existing.id, meta: { name: existing.name } });

    revalidatePath("/admin/products/tags");
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to delete tag."));
  }
}

// ============================================================================
// Product attribute management
// ============================================================================

export async function createProductAttribute(formData: FormData): Promise<ActionResult> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Attribute name is required.");

    const slug = slugify(name);
    if (!slug) return fail("Attribute slug is invalid.");

    const existing = await prisma.productAttribute.findFirst({
      where: { tenantId: TENANT_ID, slug },
      select: { id: true },
    });
    if (existing) return fail(`Attribute "${name}" already exists.`);

    await prisma.productAttribute.create({
      data: {
        tenantId: TENANT_ID,
        name,
        slug,
        type: String(formData.get("type") ?? "select") || "select",
        isVariation: formData.get("isVariation") === "on",
        isFilterable: formData.get("isFilterable") === "on",
        isVisible: formData.get("isVisible") !== "off",
        order: Number.parseInt(String(formData.get("order") ?? "0"), 10) || 0,
      },
    });

    await logAudit({ action: "CATEGORY_CREATE", entity: "ProductAttribute", entityId: slug, meta: { name, slug } });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create attribute."));
  }
}

export async function deleteProductAttribute(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.productAttribute.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, name: true },
    });
    if (!existing) return fail("Attribute not found.");

    await prisma.productAttribute.delete({ where: { id: existing.id } });

    await logAudit({ action: "CATEGORY_DELETE", entity: "ProductAttribute", entityId: existing.id, meta: { name: existing.name } });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to delete attribute."));
  }
}

export async function createAttributeTerm(formData: FormData): Promise<ActionResult> {
  try {
    const attributeId = String(formData.get("attributeId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Term name is required.");

    const attribute = await prisma.productAttribute.findFirst({
      where: { id: attributeId, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (!attribute) return fail("Attribute not found.");

    const slug = slugify(name);
    if (!slug) return fail("Term slug is invalid.");

    await prisma.productAttributeTerm.create({
      data: { attributeId: attribute.id, name, slug },
    });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create term."));
  }
}

export async function deleteAttributeTerm(id: string): Promise<ActionResult> {
  try {
    const existing = await prisma.productAttributeTerm.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!existing) return fail("Term not found.");

    await prisma.productAttributeTerm.delete({ where: { id: existing.id } });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to delete term."));
  }
}

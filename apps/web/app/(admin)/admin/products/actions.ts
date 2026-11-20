"use server";

import { revalidatePath } from "next/cache";
import { ProductLinkType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import {
  parseProductFormData,
  slugify,
  type ParsedRelations,
  type ParsedVariantInput,
} from "@/modules/ecommerce/product-form";
import { saveCustomFieldValuesWithTx } from "../custom-fields/actions";

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

async function validTermIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await prisma.productAttributeTerm.findMany({
    where: { attribute: { tenantId: TENANT_ID }, id: { in: ids } },
    select: { id: true },
  });
  return new Set(rows.map((row) => row.id));
}

async function validateProductReferences(data: {
  shippingClassId?: string | null;
  vendorId?: string | null;
}): Promise<string | null> {
  if (data.shippingClassId) {
    const shippingClass = await prisma.shippingClass.findFirst({
      where: { id: data.shippingClassId, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (!shippingClass) return "Shipping class not found.";
  }
  if (data.vendorId) {
    const vendor = await prisma.user.findFirst({
      where: { id: data.vendorId, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (!vendor) return "Vendor not found.";
  }
  return null;
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
): Promise<void> {
  const categoryIds = await validCategoryIds(relations.categoryIds);
  const tagIds = await validTagIds(relations.tagIds);
  const attributeIds = new Set(await validAttributeIds(relations.attributeValues.map((v) => v.attributeId)));
  const termIds = await validTermIds(
    relations.attributeValues.map((v) => v.termId).filter((id): id is string => Boolean(id)),
  );

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
  const attributeValues = relations.attributeValues.filter(
    (value) => attributeIds.has(value.attributeId) && (!value.termId || termIds.has(value.termId)),
  );
  if (attributeValues.length > 0) {
    await tx.productAttributeValue.createMany({
      data: attributeValues.map((value) => ({ ...value, productId })),
    });
  }

  // Images: posted order is authoritative — featured first, then gallery.
  const desired: string[] = [];
  if (relations.imageAssetId) desired.push(relations.imageAssetId);
  for (const id of relations.galleryAssetIds) {
    if (!desired.includes(id)) desired.push(id);
  }

  const validAssetIds =
    desired.length === 0
      ? []
      : (
          await tx.asset.findMany({
            where: { id: { in: desired }, tenantId: TENANT_ID },
            select: { id: true },
          })
        ).map((a) => a.id);
  const validSet = new Set(validAssetIds);
  const ordered = desired.filter((id) => validSet.has(id));

  const existing = await tx.productImage.findMany({
    where: { productId },
    select: { assetId: true, alt: true },
  });
  const altByAsset = new Map(existing.map((row) => [row.assetId, row.alt]));

  await tx.productImage.deleteMany({ where: { productId } });
  if (ordered.length > 0) {
    await tx.productImage.createMany({
      data: ordered.map((assetId, index) => ({
        productId,
        assetId,
        alt: altByAsset.get(assetId) ?? null,
        isMain: index === 0,
        position: index,
      })),
    });
  }
}

type VariantWriteData = Omit<Prisma.ProductVariantUncheckedCreateInput, "productId">;

function variantData(variant: ParsedVariantInput): VariantWriteData {
  const rest = { ...variant };
  delete rest.id;
  return {
    ...rest,
    stockStatus: rest.stockStatus as Prisma.ProductVariantUncheckedCreateInput["stockStatus"],
    price: rest.salePrice ?? rest.regularPrice,
    downloadFiles: rest.downloadFiles,
    attributes: rest.attributes,
  };
}

async function syncProductVariants(
  tx: Prisma.TransactionClient,
  productId: string,
  variants: ParsedVariantInput[],
): Promise<void> {
  const existing = await tx.productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((variant) => variant.id));
  const keepIds = new Set<string>();

  for (const variant of variants) {
    if (variant.id && !existingIds.has(variant.id)) {
      throw new Error("Variant not found.");
    }
    if (variant.id) keepIds.add(variant.id);
    if (variant.imageAssetId) {
      const asset = await tx.asset.findFirst({
        where: { id: variant.imageAssetId, tenantId: TENANT_ID },
        select: { id: true },
      });
      if (!asset) throw new Error("Variant image not found.");
    }
  }

  await tx.productVariant.deleteMany({
    where: { productId, id: { notIn: [...keepIds] } },
  });

  for (const variant of variants) {
    const data = variantData(variant);
    if (variant.id) {
      await tx.productVariant.update({ where: { id: variant.id }, data });
    } else {
      await tx.productVariant.create({ data: { ...data, productId } });
    }
  }
}

const PRODUCT_LINK_FIELDS: Record<string, ProductLinkType> = {
  relatedProductIds: ProductLinkType.RELATED,
  crossSellProductIds: ProductLinkType.CROSS_SELL,
  upSellProductIds: ProductLinkType.UP_SELL,
  bundleChildIds: ProductLinkType.BUNDLE_CHILD,
  groupedChildIds: ProductLinkType.GROUPED_CHILD,
};

async function syncProductLinks(
  tx: Prisma.TransactionClient,
  productId: string,
  links: ParsedRelations["productLinks"],
): Promise<void> {
  const allIds = [...new Set(Object.values(links).flat())].filter((id) => id !== productId);
  const validIds = allIds.length === 0
    ? new Set<string>()
    : new Set(
        (
          await tx.product.findMany({
            where: { tenantId: TENANT_ID, id: { in: allIds } },
            select: { id: true },
          })
        ).map((product) => product.id),
      );

  const rows: Prisma.ProductLinkCreateManyInput[] = [];
  for (const [field, type] of Object.entries(PRODUCT_LINK_FIELDS)) {
    const ids = links[field as keyof typeof links] ?? [];
    ids.forEach((id, index) => {
      if (id !== productId && validIds.has(id)) {
        rows.push({ tenantId: TENANT_ID, productId, linkedProductId: id, type, position: index });
      }
    });
  }

  await tx.productLink.deleteMany({ where: { productId } });
  if (rows.length > 0) {
    await tx.productLink.createMany({ data: rows, skipDuplicates: true });
  }
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  await requireSection("products");
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Product name is required.");

    const { data, relations } = parseProductFormData(formData);
    if (!data.slug) data.slug = await uniqueSlug(name);

    const referenceError = await validateProductReferences(data);
    if (referenceError) return fail(referenceError);

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
      const customFields = await saveCustomFieldValuesWithTx(
        tx,
        "product",
        created.id,
        String(formData.get("customFieldValues") ?? "{}"),
      );
      if (!customFields.ok) throw new Error(customFields.error);
      await syncProductRelations(tx, created.id, relations);
      await syncProductVariants(tx, created.id, relations.variants);
      await syncProductLinks(tx, created.id, relations.productLinks);
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
  await requireSection("products");
  try {
    const existing = await prisma.product.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, slug: true, status: true, publishedAt: true },
    });
    if (!existing) return fail("Product not found.");

    const { data, relations } = parseProductFormData(formData);

    if (!data.slug) data.slug = await uniqueSlug(data.name || existing.slug, existing.id);

    const referenceError = await validateProductReferences(data);
    if (referenceError) return fail(referenceError);

    if (data.slug !== existing.slug) {
      const duplicate = await prisma.product.findUnique({ where: { slug: data.slug }, select: { id: true } });
      if (duplicate) return fail(`Slug "${data.slug}" is already taken.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: {
          ...data,
          publishedAt: existing.publishedAt ?? (data.status === "PUBLISHED" ? new Date() : null),
        },
      });
      const customFields = await saveCustomFieldValuesWithTx(
        tx,
        "product",
        existing.id,
        String(formData.get("customFieldValues") ?? "{}"),
      );
      if (!customFields.ok) throw new Error(customFields.error);
      await syncProductRelations(tx, existing.id, relations);
      await syncProductVariants(tx, existing.id, relations.variants);
      await syncProductLinks(tx, existing.id, relations.productLinks);
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
  await requireSection("products");
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
  await requireSection("products");
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

    const imageAssetRaw = String(formData.get("imageAssetId") ?? "").trim();
    const imageAssetId = imageAssetRaw
      ? await prisma.asset
          .findFirst({ where: { id: imageAssetRaw, tenantId: TENANT_ID }, select: { id: true } })
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
        imageAssetId,
        seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
        metaDesc: String(formData.get("metaDesc") ?? "").trim() || null,
        focusKeyphrase: String(formData.get("focusKeyphrase") ?? "").trim() || null,
        ogImage: String(formData.get("ogImage") ?? "").trim() || null,
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
  await requireSection("products");
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

/** Set (or clear, with `assetId: null`) the image representing a category. */
export async function setProductCategoryImage(id: string, assetId: string | null): Promise<ActionResult> {
  await requireSection("products");
  try {
    const existing = await prisma.productCategory.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, name: true },
    });
    if (!existing) return fail("Category not found.");

    if (assetId) {
      const asset = await prisma.asset.findFirst({
        where: { id: assetId, tenantId: TENANT_ID },
        select: { id: true },
      });
      if (!asset) return fail("Image not found.");
    }

    await prisma.productCategory.update({ where: { id: existing.id }, data: { imageAssetId: assetId } });

    await logAudit({
      action: assetId ? "CATEGORY_IMAGE_CREATE" : "CATEGORY_IMAGE_DELETE",
      entity: "ProductCategory",
      entityId: existing.id,
      meta: { name: existing.name, imageAssetId: assetId },
    });

    revalidatePath("/admin/products/categories");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to update category image."));
  }
}

// ============================================================================
// Product tag management
// ============================================================================

export async function createProductTag(formData: FormData): Promise<ActionResult> {
  await requireSection("products");
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

    await logAudit({ action: "TAG_CREATE", entity: "ProductTag", entityId: slug, meta: { name, slug } });

    revalidatePath("/admin/products/tags");
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create tag."));
  }
}

export async function deleteProductTag(id: string): Promise<ActionResult> {
  await requireSection("products");
  try {
    const existing = await prisma.productTag.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, name: true },
    });
    if (!existing) return fail("Tag not found.");

    await prisma.productTag.delete({ where: { id: existing.id } });

    await logAudit({ action: "TAG_DELETE", entity: "ProductTag", entityId: existing.id, meta: { name: existing.name } });

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
  await requireSection("products");
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

    await logAudit({ action: "ATTRIBUTE_CREATE", entity: "ProductAttribute", entityId: slug, meta: { name, slug } });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create attribute."));
  }
}

export async function deleteProductAttribute(id: string): Promise<ActionResult> {
  await requireSection("products");
  try {
    const existing = await prisma.productAttribute.findFirst({
      where: { id, tenantId: TENANT_ID },
      select: { id: true, name: true },
    });
    if (!existing) return fail("Attribute not found.");

    await prisma.productAttribute.delete({ where: { id: existing.id } });

    await logAudit({ action: "ATTRIBUTE_DELETE", entity: "ProductAttribute", entityId: existing.id, meta: { name: existing.name } });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to delete attribute."));
  }
}

export async function createAttributeTerm(formData: FormData): Promise<ActionResult> {
  await requireSection("products");
  try {
    const attributeId = String(formData.get("attributeId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Term name is required.");

    const attribute = await prisma.productAttribute.findFirst({
      where: { id: attributeId, tenantId: TENANT_ID },
      select: { id: true },
    });
    if (!attribute) return fail("Attribute not found.");

    const slug = slugify(String(formData.get("slug") ?? "").trim() || name);
    if (!slug) return fail("Term slug is invalid.");

    const duplicate = await prisma.productAttributeTerm.findFirst({
      where: { attributeId: attribute.id, slug },
      select: { id: true },
    });
    if (duplicate) return fail(`Term "${name}" already exists.`);

    const term = await prisma.productAttributeTerm.create({
      data: { attributeId: attribute.id, name, slug },
    });

    await logAudit({
      action: "ATTRIBUTE_TERM_CREATE",
      entity: "ProductAttributeTerm",
      entityId: term.id,
      meta: { attributeId: attribute.id, name, slug },
    });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to create term."));
  }
}

export async function deleteAttributeTerm(id: string): Promise<ActionResult> {
  await requireSection("products");
  try {
    const existing = await prisma.productAttributeTerm.findFirst({
      where: { id, attribute: { tenantId: TENANT_ID } },
      select: { id: true, name: true, attributeId: true },
    });
    if (!existing) return fail("Term not found.");

    await prisma.productAttributeTerm.delete({ where: { id: existing.id } });

    await logAudit({
      action: "ATTRIBUTE_TERM_DELETE",
      entity: "ProductAttributeTerm",
      entityId: existing.id,
      meta: { attributeId: existing.attributeId, name: existing.name },
    });

    revalidatePath("/admin/products/attributes");
    return { ok: true };
  } catch (e) {
    return fail(errorMessage(e, "Failed to delete term."));
  }
}

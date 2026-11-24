/**
 * E-Commerce Module — Product form parsing helpers.
 *
 * Pure, framework-free helpers shared by the server actions and unit tests.
 * FormData is the single source of truth: fields rendered by the form are read
 * back verbatim (checkbox absent = false), fields the form does not manage are
 * never touched so an update cannot silently wipe them.
 */
import type { Prisma } from "@prisma/client";

export interface ParsedVariantInput {
  id?: string;
  sku: string | null;
  name: string | null;
  regularPrice: number;
  salePrice: number | null;
  stockStatus: string;
  stockQuantity: number | null;
  manageStock: boolean;
  backorders: string;
  lowStockAmount: number | null;
  weight: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  imageAssetId: string | null;
  downloadable: boolean;
  downloadLimit: number | null;
  downloadExpiry: number | null;
  downloadFiles: Prisma.InputJsonValue;
  virtual: boolean;
  description: string | null;
  purchaseNote: string | null;
  menuOrder: number;
  attributes: Prisma.InputJsonValue;
}

export const PRODUCT_LINK_FIELDS = [
  "relatedProductIds",
  "crossSellProductIds",
  "upSellProductIds",
  "bundleChildIds",
  "groupedChildIds",
] as const;

export type ProductLinkField = (typeof PRODUCT_LINK_FIELDS)[number];

export interface ParsedRelations {
  categoryIds: string[];
  primaryCategoryId: string | null;
  tagIds: string[];
  attributeValues: Array<{
    attributeId: string;
    termId: string | null;
    customValue: string | null;
    isVisible: boolean;
    isVariation: boolean;
    position: number;
  }>;
  imageAssetId: string | null;
  /** Additional gallery images, in display order (featured image excluded). */
  galleryAssetIds: string[];
  variants: ParsedVariantInput[];
  productLinks: Record<ProductLinkField, string[]>;
}

export type ParsedProductData = Omit<
  Prisma.ProductUncheckedCreateInput,
  "tenantId" | "price" | "publishedAt" | "averageRating" | "reviewCount"
> & {
  price: number;
};

export interface ParsedProductForm {
  data: ParsedProductData;
  relations: ParsedRelations;
}

/** Lowercase, dash-separated URL slug. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A sale price only applies inside its own start/end window. */
export function isSaleActive(
  salePrice: number | null | undefined,
  start: Date | null | undefined,
  end: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (salePrice === null || salePrice === undefined) return false;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

/** Effective storefront price: sale price when active, otherwise regular price. */
export function computeProductPrice(
  regularPrice: number,
  salePrice: number | null | undefined,
  start: Date | null | undefined,
  end: Date | null | undefined,
  now: Date = new Date(),
): number {
  return isSaleActive(salePrice, start, end, now) ? Number(salePrice) : regularPrice;
}

export const VARIANT_SALE_START_KEY = "__salePriceStart";
export const VARIANT_SALE_END_KEY = "__salePriceEnd";

type VariantSaleMetadata = {
  price?: number | null;
  regularPrice?: number | null;
  salePrice?: number | null;
  attributes?: unknown;
};

export type EffectiveVariantPrice = {
  price: number;
  regularPrice: number;
  salePrice: number | null;
  onSale: boolean;
  saleEndsAt: Date | null;
};

function attributeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function metadataDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getVariantSaleWindow(variant: VariantSaleMetadata): {
  start: Date | null;
  end: Date | null;
} {
  const attributes = attributeRecord(variant.attributes);
  return {
    start: metadataDate(attributes?.[VARIANT_SALE_START_KEY]),
    end: metadataDate(attributes?.[VARIANT_SALE_END_KEY]),
  };
}

export function getEffectiveVariantPrice(
  variant: VariantSaleMetadata,
  now: Date = new Date(),
): EffectiveVariantPrice {
  const regular = Number(variant.regularPrice ?? variant.price ?? 0);
  const regularPrice = Number.isFinite(regular) ? regular : 0;
  const rawSale = variant.salePrice === null || variant.salePrice === undefined
    ? null
    : Number(variant.salePrice);
  const salePrice = rawSale !== null && Number.isFinite(rawSale) && rawSale >= 0 ? rawSale : null;
  const { start, end } = getVariantSaleWindow(variant);
  const onSale = isSaleActive(salePrice, start, end, now);
  return {
    price: onSale && salePrice !== null ? salePrice : regularPrice,
    regularPrice,
    salePrice: onSale ? salePrice : null,
    onSale,
    saleEndsAt: onSale ? end : null,
  };
}

function readString(fd: FormData, key: string): string | null {
  const raw = fd.get(key);
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed === "" ? null : trimmed;
}

function readText(fd: FormData, key: string): string {
  return readString(fd, key) ?? "";
}

function readBool(fd: FormData, key: string): boolean {
  const raw = fd.get(key);
  return raw === "on" || raw === "true" || raw === "1";
}

function readNumber(fd: FormData, key: string, fallback: number | null = null): number | null {
  const raw = readString(fd, key);
  if (raw === null) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readInt(fd: FormData, key: string, fallback: number | null = null): number | null {
  const parsed = readNumber(fd, key, null);
  return parsed === null ? fallback : Math.trunc(parsed);
}

function readDate(fd: FormData, key: string): Date | null {
  const raw = readString(fd, key);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readEnum<T extends string>(
  fd: FormData,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = readString(fd, key);
  return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

function field<K extends string, V>(fd: FormData, key: K, value: V): Partial<Record<K, V>> {
  return fd.has(key) ? ({ [key]: value } as Partial<Record<K, V>>) : {};
}

function readJson(fd: FormData, key: string, label: string): Prisma.InputJsonValue {
  const raw = readString(fd, key);
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  if (!Array.isArray(parsed) && (parsed === null || typeof parsed !== "object")) {
    throw new Error(`${label} must be a JSON object or array.`);
  }
  return parsed as Prisma.InputJsonValue;
}

export function readIdList(fd: FormData, key: string, label: string): string[] {
  const values = new Set<string>();
  for (const raw of fd.getAll(key)) {
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        throw new Error(`${label} must be a list of product ids.`);
      }
      if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) {
        throw new Error(`${label} must be a list of product ids.`);
      }
      for (const id of parsed) values.add(id);
    } else {
      values.add(trimmed);
    }
  }
  return [...values];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function variantNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`);
  return parsed;
}

function variantText(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label} must be text.`);
  return value.trim() || null;
}

function variantDate(value: unknown, label: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date.`);
  return date;
}

function variantBoolean(value: unknown): boolean {
  return value === true || value === "on" || value === "true" || value === 1 || value === "1";
}

function parseVariantValue(value: unknown, label: string): Prisma.InputJsonValue {
  if (value === null || value === undefined || value === "") return {};
  if (typeof value === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} must be valid JSON.`);
    }
    return asRecord(parsed, label) as Prisma.InputJsonValue;
  }
  return asRecord(value, label) as Prisma.InputJsonValue;
}

export function parseVariantData(fd: FormData): ParsedVariantInput[] {
  const raw = readString(fd, "variantData");
  if (!raw || raw === "[]") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Variants must be valid JSON.");
  }
  if (!Array.isArray(parsed)) throw new Error("Variants must be a JSON array.");

  return parsed.map((entry, index) => {
    const label = `Variant ${index + 1}`;
    const row = asRecord(entry, label);
    const regularPrice = variantNumber(row.regularPrice ?? row.price, `${label} regular price`);
    if (regularPrice === null || regularPrice < 0) {
      throw new Error(`${label} regular price must be zero or greater.`);
    }
    const salePrice = variantNumber(row.salePrice, `${label} sale price`);
    const salePriceStart = variantDate(row.salePriceStart, `${label} sale start`);
    const salePriceEnd = variantDate(row.salePriceEnd, `${label} sale end`);
    if (salePriceStart && salePriceEnd && salePriceStart > salePriceEnd) {
      throw new Error(`${label} sale end must be after its start.`);
    }
    const stockQuantity = variantNumber(row.stockQuantity, `${label} stock quantity`);
    const downloadLimit = variantNumber(row.downloadLimit, `${label} download limit`);
    const downloadExpiry = variantNumber(row.downloadExpiry, `${label} download expiry`);
    const menuOrder = variantNumber(row.menuOrder, `${label} menu order`);
    const id = variantText(row.id, `${label} id`);
    const attributes: Record<string, unknown> = {
      ...(attributeRecord(parseVariantValue(row.attributes, `${label} attributes`)) ?? {}),
    };
    if (salePriceStart) attributes[VARIANT_SALE_START_KEY] = salePriceStart.toISOString();
    else delete attributes[VARIANT_SALE_START_KEY];
    if (salePriceEnd) attributes[VARIANT_SALE_END_KEY] = salePriceEnd.toISOString();
    else delete attributes[VARIANT_SALE_END_KEY];

    return {
      ...(id ? { id } : {}),
      sku: variantText(row.sku, `${label} SKU`),
      name: variantText(row.name, `${label} name`),
      regularPrice,
      salePrice,
      stockStatus: typeof row.stockStatus === "string" ? row.stockStatus : "IN_STOCK",
      stockQuantity,
      manageStock: variantBoolean(row.manageStock),
      backorders: typeof row.backorders === "string" ? row.backorders : "no",
      lowStockAmount: variantNumber(row.lowStockAmount, `${label} low stock amount`),
      weight: variantNumber(row.weight, `${label} weight`),
      length: variantNumber(row.length, `${label} length`),
      width: variantNumber(row.width, `${label} width`),
      height: variantNumber(row.height, `${label} height`),
      imageAssetId: variantText(row.imageAssetId, `${label} image`),
      downloadable: variantBoolean(row.downloadable),
      downloadLimit,
      downloadExpiry,
      downloadFiles: Array.isArray(row.downloadFiles)
        ? (row.downloadFiles as Prisma.InputJsonValue)
        : [],
      virtual: variantBoolean(row.virtual),
      description: variantText(row.description, `${label} description`),
      purchaseNote: variantText(row.purchaseNote, `${label} purchase note`),
      menuOrder: menuOrder ?? index,
      attributes: attributes as Prisma.InputJsonValue,
    };
  });
}

const PRODUCT_BULK_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "PRIVATE"] as const;

export type ProductBulkActionResult =
  | { ok: true; action: "status"; value: (typeof PRODUCT_BULK_STATUSES)[number] }
  | { ok: true; action: "featured"; value: boolean }
  | { ok: false; error: string };

export function parseProductBulkAction(formData: FormData): ProductBulkActionResult {
  const action = String(formData.get("action") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (action === "status") {
    if (!(PRODUCT_BULK_STATUSES as readonly string[]).includes(value)) {
      return { ok: false, error: "Invalid status" };
    }
    return { ok: true, action, value: value as (typeof PRODUCT_BULK_STATUSES)[number] };
  }
  if (action === "featured") {
    if (value !== "true" && value !== "false") return { ok: false, error: "Invalid featured value" };
    return { ok: true, action, value: value === "true" };
  }
  return { ok: false, error: "Invalid action" };
}

const PRODUCT_TYPES = ["SIMPLE", "VARIABLE", "SUBSCRIPTION", "SERVICE", "EXTERNAL", "GROUPED", "BUNDLE"] as const;
const PRODUCT_STATUSES = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "PRIVATE"] as const;
const PRODUCT_VISIBILITIES = ["PUBLIC", "PRIVATE", "MEMBERS", "HIDDEN"] as const;
const STOCK_STATUSES = ["IN_STOCK", "OUT_OF_STOCK", "ON_BACKORDER", "LOW_STOCK"] as const;
const TAX_METHODS = ["NONE", "STANDARD", "REDUCED", "ZERO_RATED", "EXEMPT"] as const;
const SUBSCRIPTION_PERIODS = ["day", "week", "month", "year"] as const;

/**
 * Attribute fields are submitted as two inputs per attribute:
 *   `attrterm_<attributeId>`  → select with `term:<termId>` or `custom`
 *   `attrcustom_<attributeId>` → free-text value, which wins when non-empty
 */
export function parseAttributeValues(fd: FormData): ParsedRelations["attributeValues"] {
  const termSelections = new Map<string, string>();
  const customValues = new Map<string, string>();

  for (const [key, raw] of fd.entries()) {
    if (typeof raw !== "string") continue;

    if (key.startsWith("attrterm_")) {
      const attributeId = key.slice("attrterm_".length);
      if (attributeId && raw.startsWith("term:")) {
        const termId = raw.slice("term:".length);
        if (termId) termSelections.set(attributeId, termId);
      }
      continue;
    }

    if (key.startsWith("attrcustom_")) {
      const attributeId = key.slice("attrcustom_".length);
      const text = raw.trim();
      if (attributeId && text) customValues.set(attributeId, text);
    }
  }

  const attributeIds = [...new Set([...termSelections.keys(), ...customValues.keys()])];

  const values: ParsedRelations["attributeValues"] = [];

  for (const attributeId of attributeIds) {
    const customValue = customValues.get(attributeId) ?? null;
    const termId = customValue ? null : termSelections.get(attributeId) ?? null;

    if (!customValue && !termId) continue;

    values.push({
      attributeId,
      termId,
      customValue,
      isVisible: true,
      isVariation: false,
      position: values.length,
    });
  }

  return values;
}

/** Build the Prisma scalar payload + relation ids from a product form submission. */
export function parseProductFormData(formData: FormData, now: Date = new Date()): ParsedProductForm {
  const name = readText(formData, "name").trim();
  const slugInput = readText(formData, "slug").trim();
  const slug = slugInput || slugify(name);

  const type = readEnum(formData, "type", PRODUCT_TYPES, "SIMPLE");
  const status = readEnum(formData, "status", PRODUCT_STATUSES, "DRAFT");
  const regularPrice = readNumber(formData, "regularPrice", 0) ?? 0;
  const salePrice = readNumber(formData, "salePrice", null);
  const salePriceStart = readDate(formData, "salePriceStart");
  const salePriceEnd = readDate(formData, "salePriceEnd");

  const dateOnSaleFrom = formData.has("dateOnSaleFrom") ? readDate(formData, "dateOnSaleFrom") : undefined;
  const dateOnSaleTo = formData.has("dateOnSaleTo") ? readDate(formData, "dateOnSaleTo") : undefined;

  const categoryIds = formData
    .getAll("categoryIds")
    .filter((v): v is string => typeof v === "string" && v !== "");

  const primaryRaw = readString(formData, "primaryCategoryId");
  const primaryCategoryId = primaryRaw && categoryIds.includes(primaryRaw) ? primaryRaw : null;

  const tagIds = formData
    .getAll("tagIds")
    .filter((v): v is string => typeof v === "string" && v !== "");

  const data: ParsedProductData = {
    name,
    slug,
    type,
    status,
    visibility: readEnum(formData, "visibility", PRODUCT_VISIBILITIES, "PUBLIC"),
    sku: readString(formData, "sku"),
    shortDescription: readString(formData, "shortDescription"),
    description: readString(formData, "description"),
    regularPrice,
    salePrice,
    salePriceStart,
    salePriceEnd,
    price: computeProductPrice(regularPrice, salePrice, salePriceStart, salePriceEnd, now),
    taxStatus: readEnum(formData, "taxStatus", TAX_METHODS, "STANDARD"),
    taxClass: readString(formData, "taxClass"),
    stockStatus: readEnum(formData, "stockStatus", STOCK_STATUSES, "IN_STOCK"),
    stockQuantity: readNumber(formData, "stockQuantity", null),
    manageStock: readBool(formData, "manageStock"),
    backorders: readText(formData, "backorders") || "no",
    lowStockAmount: readNumber(formData, "lowStockAmount", null),
    soldIndividually: readBool(formData, "soldIndividually"),
    weight: readNumber(formData, "weight", null),
    length: readNumber(formData, "length", null),
    width: readNumber(formData, "width", null),
    height: readNumber(formData, "height", null),
    ...field(formData, "shippingClassId", readString(formData, "shippingClassId")),
    shippingRequired: readBool(formData, "shippingRequired"),
    shippingTaxable: readBool(formData, "shippingTaxable"),
    externalUrl: readString(formData, "externalUrl"),
    externalButtonText: readString(formData, "externalButtonText"),
    ...field(formData, "subscriptionPeriod", readEnum(formData, "subscriptionPeriod", SUBSCRIPTION_PERIODS, "month")),
    ...field(formData, "subscriptionInterval", readInt(formData, "subscriptionInterval", null)),
    ...field(formData, "subscriptionLength", readInt(formData, "subscriptionLength", null)),
    ...field(formData, "subscriptionTrialPeriod", readInt(formData, "subscriptionTrialPeriod", null)),
    ...field(formData, "subscriptionSignUpFee", readNumber(formData, "subscriptionSignUpFee", null)),
    ...field(formData, "membershipAccess", readString(formData, "membershipAccess")),
    ...field(formData, "membershipDuration", readString(formData, "membershipDuration")),
    ...field(formData, "serviceDuration", readInt(formData, "serviceDuration", null)),
    ...field(formData, "serviceBufferBefore", readInt(formData, "serviceBufferBefore", null)),
    ...field(formData, "serviceBufferAfter", readInt(formData, "serviceBufferAfter", null)),
    ...field(formData, "serviceMaxBookings", readInt(formData, "serviceMaxBookings", null)),
    ...field(formData, "serviceLocation", readString(formData, "serviceLocation")),
    ...field(formData, "serviceCalendarId", readString(formData, "serviceCalendarId")),
    ...field(formData, "commissionRate", readNumber(formData, "commissionRate", null)),
    ...field(formData, "commissionType", readString(formData, "commissionType")),
    ...field(formData, "vendorId", readString(formData, "vendorId")),
    downloadable: readBool(formData, "downloadable"),
    downloadLimit: readInt(formData, "downloadLimit", null),
    downloadExpiry: readInt(formData, "downloadExpiry", null),
    downloadFiles: readJson(formData, "downloadFiles", "Download files"),
    virtual: readBool(formData, "virtual"),
    reviewsAllowed: readBool(formData, "reviewsAllowed"),
    purchaseNote: readString(formData, "purchaseNote"),
    menuOrder: readInt(formData, "menuOrder", 0) ?? 0,
    featured: readBool(formData, "featured"),
    catalogVisibility: readText(formData, "catalogVisibility") || "visible",
    dateOnSaleFrom,
    dateOnSaleTo,
    seoTitle: readString(formData, "seoTitle"),
    metaDesc: readString(formData, "metaDesc"),
    focusKeyphrase: readString(formData, "focusKeyphrase"),
    canonicalUrl: readString(formData, "canonicalUrl"),
    ogImage: readString(formData, "ogImage"),
  };

  const imageAssetId = readString(formData, "imageAssetId");

  const galleryAssetIds = formData
    .getAll("galleryAssetIds")
    .filter((v): v is string => typeof v === "string" && v !== "");

  const productLinks = {} as Record<ProductLinkField, string[]>;
  for (const key of PRODUCT_LINK_FIELDS) {
    productLinks[key] = readIdList(formData, key, "Product relationships");
  }

  return {
    data,
    relations: {
      categoryIds,
      primaryCategoryId,
      tagIds,
      attributeValues: parseAttributeValues(formData),
      imageAssetId,
      galleryAssetIds,
      variants: parseVariantData(formData),
      productLinks,
    },
  };
}

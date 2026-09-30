/**
 * E-Commerce Module — Product form parsing helpers.
 *
 * Pure, framework-free helpers shared by the server actions and unit tests.
 * FormData is the single source of truth: fields rendered by the form are read
 * back verbatim (checkbox absent = false), fields the form does not manage are
 * never touched so an update cannot silently wipe them.
 */
import type { Prisma } from "@prisma/client";

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

function readJson(fd: FormData, key: string): Prisma.InputJsonValue {
  const raw = readString(fd, key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return (Array.isArray(parsed) || (parsed !== null && typeof parsed === "object"))
      ? (parsed as Prisma.InputJsonValue)
      : [];
  } catch {
    return [];
  }
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
    shippingRequired: readBool(formData, "shippingRequired"),
    shippingTaxable: readBool(formData, "shippingTaxable"),
    externalUrl: readString(formData, "externalUrl"),
    externalButtonText: readString(formData, "externalButtonText"),
    subscriptionPeriod: readEnum(formData, "subscriptionPeriod", SUBSCRIPTION_PERIODS, "month"),
    subscriptionInterval: readInt(formData, "subscriptionInterval", null),
    subscriptionLength: readInt(formData, "subscriptionLength", null),
    subscriptionTrialPeriod: readInt(formData, "subscriptionTrialPeriod", null),
    subscriptionSignUpFee: readNumber(formData, "subscriptionSignUpFee", null),
    membershipAccess: readString(formData, "membershipAccess"),
    membershipDuration: readString(formData, "membershipDuration"),
    serviceDuration: readInt(formData, "serviceDuration", null),
    serviceBufferBefore: readInt(formData, "serviceBufferBefore", null),
    serviceBufferAfter: readInt(formData, "serviceBufferAfter", null),
    serviceMaxBookings: readInt(formData, "serviceMaxBookings", null),
    serviceLocation: readString(formData, "serviceLocation"),
    serviceCalendarId: readString(formData, "serviceCalendarId"),
    downloadable: readBool(formData, "downloadable"),
    downloadLimit: readInt(formData, "downloadLimit", null),
    downloadExpiry: readInt(formData, "downloadExpiry", null),
    downloadFiles: readJson(formData, "downloadFiles"),
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

  if (type !== "SUBSCRIPTION") {
    data.subscriptionPeriod = null;
    data.subscriptionInterval = null;
    data.subscriptionLength = null;
    data.subscriptionTrialPeriod = null;
    data.subscriptionSignUpFee = null;
    data.membershipAccess = null;
    data.membershipDuration = null;
  }

  if (type !== "SERVICE") {
    data.serviceDuration = null;
    data.serviceBufferBefore = null;
    data.serviceBufferAfter = null;
    data.serviceMaxBookings = null;
    data.serviceLocation = null;
    data.serviceCalendarId = null;
  }

  const imageAssetId = readString(formData, "imageAssetId");

  return {
    data,
    relations: {
      categoryIds,
      primaryCategoryId,
      tagIds,
      attributeValues: parseAttributeValues(formData),
      imageAssetId,
    },
  };
}

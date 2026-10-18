import type { Block } from "@/lib/page-builder/types";
import { isValidUrl } from "@/lib/page-builder/validate";
import { sanitizeHtml } from "@/lib/style-guide";

/**
 * Structured data bindings for listing template blocks — the listing-world
 * counterpart of lib/blog-template/article-bindings.ts. A block prop can be
 * connected to a listing field (e.g. heading ← title); the saved value stays
 * as a fallback when the listing field is empty. Free-text {{token}} binding
 * still runs afterwards via ctx.bind, so both systems coexist.
 */

export type ListingBindingValueType = "text" | "richText" | "image" | "url" | "date";

export interface ListingBindingField {
  key: string;
  label: string;
  valueType: ListingBindingValueType;
}

/** Serializable subset of a listing the bindings resolve against. */
export interface ListingBindingData {
  title?: string | null;
  companyName?: string | null;
  summary?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  slug?: string | null;
  tier?: string | null;
  status?: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
  avatarImage?: string | null;
  feedImage?: string | null;
  createdAt?: Date | string | null;
  category?: { title?: string | null; slug?: string | null } | null;
  /** Derived display region ("Miami, FL") when available. */
  region?: string | null;
  /** Derived absolute/relative listing page URL. */
  listingUrl?: string | null;
}

export interface ListingBlockBindings {
  [target: string]: string | undefined;
}

export const LISTING_BINDING_FIELDS: ListingBindingField[] = [
  { key: "title", label: "Listing title", valueType: "text" },
  { key: "companyName", label: "Company name", valueType: "text" },
  { key: "summary", label: "Summary", valueType: "richText" },
  { key: "description", label: "Full description", valueType: "richText" },
  { key: "city", label: "City", valueType: "text" },
  { key: "state", label: "State", valueType: "text" },
  { key: "address", label: "Street address", valueType: "text" },
  { key: "zip", label: "ZIP code", valueType: "text" },
  { key: "phone", label: "Phone", valueType: "text" },
  { key: "email", label: "Email", valueType: "text" },
  { key: "website", label: "Website URL", valueType: "url" },
  { key: "listingUrl", label: "Listing page URL", valueType: "url" },
  { key: "slug", label: "URL slug", valueType: "text" },
  { key: "tier", label: "Tier", valueType: "text" },
  { key: "status", label: "Status", valueType: "text" },
  { key: "category.title", label: "Category name", valueType: "text" },
  { key: "region", label: "Region (city, state)", valueType: "text" },
  { key: "averageRating", label: "Average rating", valueType: "text" },
  { key: "reviewCount", label: "Review count", valueType: "text" },
  { key: "avatarImage", label: "Logo image", valueType: "image" },
  { key: "feedImage", label: "Cover image", valueType: "image" },
  { key: "createdAt", label: "Created date", valueType: "date" },
];

/** Standard content properties that can read listing data. */
const TARGETS_BY_BLOCK: Record<string, Record<string, { label: string; valueType: ListingBindingValueType }>> = {
  text: { content: { label: "Content", valueType: "richText" } },
  heading: { text: { label: "Text", valueType: "text" } },
  image: {
    src: { label: "Image source", valueType: "image" },
    alt: { label: "Alt text", valueType: "text" },
    caption: { label: "Caption", valueType: "text" },
  },
  button: {
    text: { label: "Button text", valueType: "text" },
    url: { label: "Button URL", valueType: "url" },
  },
  listingAbout: { heading: { label: "Heading", valueType: "text" } },
  listingDescription: { heading: { label: "Heading", valueType: "text" } },
  listingDetails: { heading: { label: "Heading", valueType: "text" } },
  listingReviews: { heading: { label: "Heading", valueType: "text" } },
  listingReviewForm: { heading: { label: "Heading", valueType: "text" } },
  listingContactForm: { title: { label: "Title", valueType: "text" } },
  listingHours: { title: { label: "Title", valueType: "text" } },
  listingAreas: { title: { label: "Title", valueType: "text" } },
  listingCategories: { title: { label: "Title", valueType: "text" } },
  listingSocial: { title: { label: "Title", valueType: "text" } },
  listingHero: {},
  listingGallery: {},
  listingMap: {},
  listingVideo: {},
  listingQuickFacts: {},
  listingClaim: {},
  spacer: {},
  divider: {},
  row: { bgImage: { label: "Background image", valueType: "image" } },
  section: { bgImage: { label: "Background image", valueType: "image" } },
};

export function listingBindingTargets(blockType: string) {
  return Object.entries(TARGETS_BY_BLOCK[blockType] ?? {}).map(([key, target]) => ({
    key,
    ...target,
  }));
}

export function listingBindingFieldsForTarget(targetType: ListingBindingValueType): ListingBindingField[] {
  return LISTING_BINDING_FIELDS.filter((field) =>
    targetType === "richText"
      ? field.valueType === "richText" || field.valueType === "text"
      : targetType === "url"
        ? field.valueType === "url" || field.valueType === "text"
        : field.valueType === targetType,
  );
}

export function resolveListingBindingValue(listing: ListingBindingData, fieldPath: string): string | null {
  if (fieldPath === "listingUrl") {
    return listing.slug ? `/listing/${listing.slug}` : null;
  }
  const value = fieldPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || key === "__proto__" || key === "prototype" || key === "constructor") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, listing);

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

/** Asset ids resolve to the /api/assets/ URL the site renderer expects. */
function resolveImageValue(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:")) return value;
  return `/api/assets/${value}/`;
}

export function resolveListingPropsBindings(
  blockType: string,
  props: Record<string, unknown>,
  listing?: ListingBindingData,
): Record<string, unknown> {
  if (!listing) return props;
  const bindings = props.bindings as ListingBlockBindings | undefined;
  if (!bindings) return props;

  const targets = listingBindingTargets(blockType);
  if (targets.length === 0) return props;

  let changed = false;
  const nextProps = { ...props };
  const allowedTargets = new Set(targets.map((target) => target.key));
  for (const [target, fieldPath] of Object.entries(bindings)) {
    if (!fieldPath || !allowedTargets.has(target)) continue;
    const targetDefinition = targets.find((item) => item.key === target);
    const resolvedValue = resolveListingBindingValue(listing, fieldPath);
    const value = targetDefinition?.valueType === "richText"
      ? (resolvedValue === null ? null : sanitizeHtml(resolvedValue))
      : targetDefinition?.valueType === "url"
        ? (resolvedValue && isValidUrl(resolvedValue) ? resolvedValue : null)
        : targetDefinition?.valueType === "image"
          ? resolveImageValue(resolvedValue)
          : resolvedValue;
    if (value === null || value === "") continue;
    const parts = target.split(".");
    let parent: Record<string, unknown> | unknown[] = nextProps;
    for (const part of parts.slice(0, -1)) {
      const current: unknown = (parent as Record<string, unknown>)[part];
      if (!current || typeof current !== "object") break;
      const clone: Record<string, unknown> | unknown[] = Array.isArray(current)
        ? [...current]
        : { ...(current as Record<string, unknown>) };
      (parent as Record<string, unknown>)[part] = clone;
      parent = clone;
    }
    const lastPart = parts[parts.length - 1];
    if (Array.isArray(parent) && /^\d+$/.test(lastPart)) parent[Number(lastPart)] = value;
    else (parent as Record<string, unknown>)[lastPart] = value;
    changed = true;
  }
  return changed ? nextProps : props;
}

/** Resolve configured listing bindings while preserving static props as fallbacks. */
export function resolveListingBlockBindings<T extends Block>(block: T, listing?: ListingBindingData): T {
  const props = block.props as Record<string, unknown>;
  const nextProps = resolveListingPropsBindings(block.type, props, listing);
  return nextProps === props ? block : ({ ...block, props: nextProps } as T);
}

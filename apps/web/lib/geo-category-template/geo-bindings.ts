import type { Block } from "@/lib/page-builder/types";
import { isValidUrl } from "@/lib/page-builder/validate";
import { sanitizeHtml } from "@/lib/style-guide";

export type GeoBindingValueType = "text" | "richText" | "image" | "url";

export interface GeoBindingField {
  key: string;
  label: string;
  valueType: GeoBindingValueType;
}

export interface GeoCategoryBindingData {
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  stateInit?: string | null;
  cityInit?: string | null;
  metaDesc?: string | null;
  seoTitle?: string | null;
  focusKeyphrase?: string | null;
}

export interface GeoRegionBindingData {
  slug?: string | null;
  state?: string | null;
  stateFull?: string | null;
  city?: string | null;
  displayName?: string | null;
  url?: string | null;
}

/** Everything a geo template binding can read for one rendered page. */
export interface GeoBindingData {
  category?: GeoCategoryBindingData | null;
  region?: GeoRegionBindingData | null;
  /** Absolute-path URL of the rendered page (category or region page). */
  categoryUrl?: string | null;
  /** Primary parent image for the category (Media Library URL). */
  heroImage?: string | null;
  heroImageAlt?: string | null;
  heroImageCaption?: string | null;
  stateImage?: string | null;
  cityImage?: string | null;
  statesCount?: number | string | null;
  listingsCount?: number | string | null;
}

/** Preview row for the builder's visual display (adds an id for selection). */
export interface GeoPreviewData extends GeoBindingData {
  id: string;
}

export interface GeoBlockBindings {
  [target: string]: string | undefined;
}

export const GEO_BINDING_FIELDS: GeoBindingField[] = [
  { key: "category.title", label: "Category title", valueType: "text" },
  { key: "category.slug", label: "Category slug", valueType: "text" },
  { key: "category.description", label: "Category description", valueType: "richText" },
  { key: "category.stateInit", label: "State intro", valueType: "richText" },
  { key: "category.cityInit", label: "City intro", valueType: "richText" },
  { key: "category.metaDesc", label: "Meta description", valueType: "text" },
  { key: "category.seoTitle", label: "SEO title", valueType: "text" },
  { key: "category.focusKeyphrase", label: "Focus keyphrase", valueType: "text" },
  { key: "categoryUrl", label: "Page URL", valueType: "url" },
  { key: "region.displayName", label: "Region name", valueType: "text" },
  { key: "region.stateFull", label: "State name", valueType: "text" },
  { key: "region.state", label: "State code", valueType: "text" },
  { key: "region.city", label: "City", valueType: "text" },
  { key: "region.url", label: "Region URL", valueType: "url" },
  { key: "heroImage", label: "Primary image", valueType: "image" },
  { key: "heroImageAlt", label: "Primary image alt text", valueType: "text" },
  { key: "heroImageCaption", label: "Primary image caption", valueType: "text" },
  { key: "stateImage", label: "State image", valueType: "image" },
  { key: "cityImage", label: "City image", valueType: "image" },
  { key: "statesCount", label: "State count", valueType: "text" },
  { key: "listingsCount", label: "Listing count", valueType: "text" },
];

/** Standard content properties in geo templates that can read geo data. */
const TARGETS_BY_BLOCK: Record<string, Record<string, { label: string; valueType: GeoBindingValueType }>> = {
  hero: {
    heading: { label: "Heading", valueType: "text" },
    subheading: { label: "Subheading", valueType: "richText" },
    bgImage: { label: "Background image", valueType: "image" },
  },
  text: { content: { label: "Content", valueType: "richText" } },
  heading: { text: { label: "Text", valueType: "text" } },
  image: {
    src: { label: "Image source", valueType: "image" },
    alt: { label: "Alt text", valueType: "text" },
    caption: { label: "Caption", valueType: "text" },
  },
  cta: {
    heading: { label: "Heading", valueType: "text" },
    body: { label: "Body", valueType: "richText" },
    buttonText: { label: "Button text", valueType: "text" },
    buttonUrl: { label: "Button URL", valueType: "url" },
    bgImage: { label: "Background image", valueType: "image" },
  },
  button: {
    text: { label: "Button text", valueType: "text" },
    url: { label: "Button URL", valueType: "url" },
  },
  embed: { html: { label: "Embed HTML", valueType: "richText" } },
  faq: { heading: { label: "Heading", valueType: "text" } },
  features: { heading: { label: "Heading", valueType: "text" } },
  testimonial: { heading: { label: "Heading", valueType: "text" } },
  list: {},
  slider: {},
  iconList: {},
  contentGrid: { heading: { label: "Heading", valueType: "text" } },
  productGrid: { heading: { label: "Heading", valueType: "text" } },
  video: { link: { label: "Video URL", valueType: "url" } },
  googleMap: { location: { label: "Map location", valueType: "text" } },
  spacer: {},
  row: { bgImage: { label: "Background image", valueType: "image" } },
  column: { bgImage: { label: "Background image", valueType: "image" } },
  section: { bgImage: { label: "Background image", valueType: "image" } },
  // Geo-specific blocks
  geoHero: {
    heading: { label: "Heading", valueType: "text" },
    subheading: { label: "Subheading", valueType: "richText" },
    image: { label: "Image", valueType: "image" },
    bgColor: { label: "Background color (image)", valueType: "image" },
  },
  geoContent: {
    heading: { label: "Heading", valueType: "text" },
    content: { label: "Content", valueType: "richText" },
  },
  geoRegionNav: { heading: { label: "Heading", valueType: "text" } },
  geoListings: { heading: { label: "Heading", valueType: "text" } },
  geoFaq: { heading: { label: "Heading", valueType: "text" } },
  geoSidebar: {},
  geoRegionChips: { heading: { label: "Heading", valueType: "text" } },
  geoFilterBar: {},
};

const ARRAY_TARGETS_BY_BLOCK: Record<string, Record<string, { label: string; valueType: GeoBindingValueType }>> = {
  faq: {
    question: { label: "Question", valueType: "text" },
    answer: { label: "Answer", valueType: "richText" },
  },
  features: {
    title: { label: "Title", valueType: "text" },
    description: { label: "Description", valueType: "richText" },
  },
  testimonial: {
    quote: { label: "Quote", valueType: "richText" },
    author: { label: "Author", valueType: "text" },
    role: { label: "Author role", valueType: "text" },
    avatar: { label: "Avatar", valueType: "image" },
  },
  list: { "": { label: "Text", valueType: "text" } },
  slider: {
    src: { label: "Image", valueType: "image" },
    alt: { label: "Alt text", valueType: "text" },
    title: { label: "Title", valueType: "text" },
    url: { label: "Link URL", valueType: "url" },
  },
  iconList: {
    text: { label: "Text", valueType: "text" },
    link: { label: "Link URL", valueType: "url" },
  },
};

export function geoBindingTargets(blockType: string, props?: Record<string, unknown>) {
  const targets = Object.entries(TARGETS_BY_BLOCK[blockType] ?? {}).map(([key, target]) => ({
    key,
    ...target,
  }));
  const arrayConfig = ARRAY_TARGETS_BY_BLOCK[blockType];
  if (!arrayConfig || !props) return targets;

  const collectionName = blockType === "slider" ? "slides" : "items";
  const collection = props[collectionName];
  if (!Array.isArray(collection)) return targets;

  for (const [index] of collection.entries()) {
    for (const [field, target] of Object.entries(arrayConfig)) {
      const key = field ? `${collectionName}.${index}.${field}` : `${collectionName}.${index}`;
      targets.push({ key, label: `${target.label} (${index + 1})`, valueType: target.valueType });
    }
  }
  return targets;
}

export function geoBindingFieldsForTarget(targetType: GeoBindingValueType): GeoBindingField[] {
  return GEO_BINDING_FIELDS.filter((field) =>
    targetType === "richText"
      ? field.valueType === "richText" || field.valueType === "text"
      : targetType === "url"
        ? field.valueType === "url" || field.valueType === "text"
        : targetType === "image"
          ? field.valueType === "image" || field.valueType === "url"
          : field.valueType === targetType,
  );
}

export function resolveGeoBindingValue(geo: GeoBindingData, fieldPath: string): string | null {
  if (fieldPath === "categoryUrl") {
    return geo.categoryUrl ?? (geo.category?.slug ? `/g/${geo.category.slug}/` : null);
  }
  const value = fieldPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || key === "__proto__" || key === "prototype" || key === "constructor") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, geo as unknown);

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function resolveGeoPropsBindings(
  blockType: string,
  props: Record<string, unknown>,
  geo?: GeoBindingData | null,
): Record<string, unknown> {
  if (!geo) return props;
  const bindings = props.bindings as GeoBlockBindings | undefined;
  if (!bindings) return props;

  let changed = false;
  const nextProps = { ...props };
  const targets = geoBindingTargets(blockType, props);
  const allowedTargets = new Set(targets.map((target) => target.key));
  for (const [target, fieldPath] of Object.entries(bindings)) {
    if (!fieldPath || !allowedTargets.has(target)) continue;
    const targetDefinition = targets.find((item) => item.key === target);
    const resolvedValue = resolveGeoBindingValue(geo, fieldPath);
    const value = targetDefinition?.valueType === "richText"
      ? (resolvedValue === null ? null : sanitizeHtml(resolvedValue))
      : targetDefinition?.valueType === "url"
        ? (resolvedValue && isValidUrl(resolvedValue) ? resolvedValue : null)
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

/** Resolve configured geo bindings while preserving static props as fallbacks. */
export function resolveGeoBlockBindings<T extends Block>(block: T, geo?: GeoBindingData | null): T {
  const props = block.props as Record<string, unknown>;
  const nextProps = resolveGeoPropsBindings(block.type, props, geo);
  return nextProps === props ? block : ({ ...block, props: nextProps } as T);
}

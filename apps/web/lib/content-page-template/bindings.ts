import type { Block } from "@/lib/page-builder/types";
import { isValidUrl } from "@/lib/page-builder/validate";
import { sanitizeHtml } from "@/lib/style-guide";
import type { ContentPageKind } from "./types";

export type ContentPageBindingValueType = "text" | "richText" | "image" | "url";

export interface ContentPageBindingField {
  key: string;
  label: string;
  valueType: ContentPageBindingValueType;
}

/** Everything a Topic/SubTopic template binding can read, for one page render. */
export interface ContentPageBindingData {
  /** The rendered page (Topic or SubTopic) content. */
  page?: {
    title?: string | null;
    slug?: string | null;
    /** Topic intro (rich) — Topic only. */
    description?: string | null;
    /** SubTopic body (rich) — SubTopic only. */
    body?: string | null;
    author?: string | null;
    metaDesc?: string | null;
    seoTitle?: string | null;
  } | null;
  /** Absolute-path URL of the rendered page. */
  pageUrl?: string | null;
  heroImage?: string | null;
  heroImageAlt?: string | null;
  heroImageCaption?: string | null;
  /** Linked GeoCategory widget — Topic only. */
  geo?: {
    title?: string | null;
    slug?: string | null;
    description?: string | null;
    url?: string | null;
  } | null;
  /** Parent Topic — SubTopic only. */
  topic?: {
    title?: string | null;
    slug?: string | null;
    url?: string | null;
  } | null;
  sectionsCount?: number | string | null;
  subtopicsCount?: number | string | null;
  geoStatesCount?: number | string | null;
}

/* ── Derived render data (lists the specific blocks consume) ───────────────── */

export interface CpSectionItem {
  title: string;
  content: string;
}

export interface CpGeoStateLink {
  slug: string;
  stateFull: string;
  url: string;
}

export interface CpGeoWidget {
  title: string;
  slug: string;
  description?: string | null;
  url: string;
  states: CpGeoStateLink[];
}

export interface CpTopicLink {
  title: string;
  slug: string;
  url: string;
  description?: string | null;
}

export interface CpSubTopicItem {
  id: string;
  title: string;
  slug: string;
  url: string;
  excerpt?: string | null;
  image?: string | null;
}

/** Full context a rendered template (or preview) draws from. */
export interface ContentPageRenderData {
  kind: ContentPageKind;
  binding: ContentPageBindingData | null;
  sections: CpSectionItem[];
  geo: CpGeoWidget | null;
  subtopics: CpSubTopicItem[];
  topic: CpTopicLink | null;
}

/** Preview row for the builder's visual display (adds an id + label). */
export interface ContentPagePreviewData {
  id: string;
  label: string;
  data: ContentPageRenderData;
}

export interface ContentPageBlockBindings {
  [target: string]: string | undefined;
}

/* ── Binding field catalog (per kind) ──────────────────────────────────────── */

export const TOPIC_BINDING_FIELDS: ContentPageBindingField[] = [
  { key: "page.title", label: "Topic title", valueType: "text" },
  { key: "page.slug", label: "Topic slug", valueType: "text" },
  { key: "page.description", label: "Topic intro", valueType: "richText" },
  { key: "page.author", label: "Author", valueType: "text" },
  { key: "page.metaDesc", label: "Meta description", valueType: "text" },
  { key: "page.seoTitle", label: "SEO title", valueType: "text" },
  { key: "pageUrl", label: "Topic URL", valueType: "url" },
  { key: "heroImage", label: "Primary image", valueType: "image" },
  { key: "heroImageAlt", label: "Primary image alt text", valueType: "text" },
  { key: "heroImageCaption", label: "Primary image caption", valueType: "text" },
  { key: "geo.title", label: "Geo category title", valueType: "text" },
  { key: "geo.slug", label: "Geo category slug", valueType: "text" },
  { key: "geo.description", label: "Geo category description", valueType: "richText" },
  { key: "geo.url", label: "Geo category URL", valueType: "url" },
  { key: "sectionsCount", label: "Section count", valueType: "text" },
  { key: "subtopicsCount", label: "Related SubTopic count", valueType: "text" },
  { key: "geoStatesCount", label: "Location count", valueType: "text" },
];

export const SUBTOPIC_BINDING_FIELDS: ContentPageBindingField[] = [
  { key: "page.title", label: "SubTopic title", valueType: "text" },
  { key: "page.slug", label: "SubTopic slug", valueType: "text" },
  { key: "page.body", label: "SubTopic body", valueType: "richText" },
  { key: "page.author", label: "Author", valueType: "text" },
  { key: "page.metaDesc", label: "Meta description", valueType: "text" },
  { key: "page.seoTitle", label: "SEO title", valueType: "text" },
  { key: "pageUrl", label: "SubTopic URL", valueType: "url" },
  { key: "heroImage", label: "Featured image", valueType: "image" },
  { key: "heroImageAlt", label: "Featured image alt text", valueType: "text" },
  { key: "heroImageCaption", label: "Featured image caption", valueType: "text" },
  { key: "topic.title", label: "Parent Topic title", valueType: "text" },
  { key: "topic.slug", label: "Parent Topic slug", valueType: "text" },
  { key: "topic.url", label: "Parent Topic URL", valueType: "url" },
  { key: "sectionsCount", label: "Section count", valueType: "text" },
];

export function cpBindingFields(kind: ContentPageKind): ContentPageBindingField[] {
  return kind === "topic" ? TOPIC_BINDING_FIELDS : SUBTOPIC_BINDING_FIELDS;
}

export function cpBindingFieldsForTarget(
  kind: ContentPageKind,
  targetType: ContentPageBindingValueType,
): ContentPageBindingField[] {
  return cpBindingFields(kind).filter((field) =>
    targetType === "richText"
      ? field.valueType === "richText" || field.valueType === "text"
      : targetType === "url"
        ? field.valueType === "url" || field.valueType === "text"
        : targetType === "image"
          ? field.valueType === "image" || field.valueType === "url"
          : field.valueType === targetType,
  );
}

/* ── Bindable targets per block ────────────────────────────────────────────── */

const TARGETS_BY_BLOCK: Record<string, Record<string, { label: string; valueType: ContentPageBindingValueType }>> = {
  // Content-page blocks
  cpHero: {
    heading: { label: "Heading", valueType: "text" },
    subheading: { label: "Subheading", valueType: "richText" },
    image: { label: "Image", valueType: "image" },
  },
  cpContent: {
    heading: { label: "Heading", valueType: "text" },
    content: { label: "Content", valueType: "richText" },
  },
  cpSections: { heading: { label: "Heading", valueType: "text" } },
  cpSidebar: {},
  topicGeoWidget: { heading: { label: "Heading", valueType: "text" } },
  topicSubTopics: { heading: { label: "Heading", valueType: "text" } },
  subtopicTopicLink: { heading: { label: "Label", valueType: "text" } },
  // Standard blocks
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
  contentGrid: { heading: { label: "Heading", valueType: "text" } },
  productGrid: { heading: { label: "Heading", valueType: "text" } },
  video: { link: { label: "Video URL", valueType: "url" } },
  googleMap: { location: { label: "Map location", valueType: "text" } },
  row: { bgImage: { label: "Background image", valueType: "image" } },
  column: { bgImage: { label: "Background image", valueType: "image" } },
  section: { bgImage: { label: "Background image", valueType: "image" } },
};

const SLIDER_ARRAY_TARGETS: Record<string, { label: string; valueType: ContentPageBindingValueType }> = {
  src: { label: "Image", valueType: "image" },
  alt: { label: "Alt text", valueType: "text" },
  title: { label: "Title", valueType: "text" },
  caption: { label: "Caption", valueType: "text" },
  url: { label: "Link URL", valueType: "url" },
};

const SLIDE_COLLECTION_BLOCKS = new Set<string>([
  "slider",
  "blogArticleSlider",
  "productSlider",
  "listingSlider",
  "companySlider",
  "geoCategorySlider",
  "sectionSlider",
  "topicSubTopicSlider",
  "imageSlider",
  "videoSlider",
]);

const ARRAY_TARGETS_BY_BLOCK: Record<string, Record<string, { label: string; valueType: ContentPageBindingValueType }>> = {
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
  blogArticleSlider: SLIDER_ARRAY_TARGETS,
  productSlider: SLIDER_ARRAY_TARGETS,
  listingSlider: SLIDER_ARRAY_TARGETS,
  companySlider: SLIDER_ARRAY_TARGETS,
  geoCategorySlider: SLIDER_ARRAY_TARGETS,
  sectionSlider: SLIDER_ARRAY_TARGETS,
  topicSubTopicSlider: SLIDER_ARRAY_TARGETS,
  imageSlider: SLIDER_ARRAY_TARGETS,
  videoSlider: SLIDER_ARRAY_TARGETS,
  iconList: {
    text: { label: "Text", valueType: "text" },
    link: { label: "Link URL", valueType: "url" },
  },
};

export function cpBindingTargets(blockType: string, props?: Record<string, unknown>) {
  const targets = Object.entries(TARGETS_BY_BLOCK[blockType] ?? {}).map(([key, target]) => ({
    key,
    ...target,
  }));
  const arrayConfig = ARRAY_TARGETS_BY_BLOCK[blockType];
  if (!arrayConfig || !props) return targets;

  const collectionName = SLIDE_COLLECTION_BLOCKS.has(blockType) ? "slides" : "items";
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

/* ── Resolution ────────────────────────────────────────────────────────────── */

export function resolveCpBindingValue(data: ContentPageBindingData, fieldPath: string): string | null {
  if (fieldPath === "pageUrl") {
    return data.pageUrl ?? null;
  }
  const value = fieldPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || key === "__proto__" || key === "prototype" || key === "constructor") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, data as unknown);

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function resolveCpPropsBindings(
  blockType: string,
  props: Record<string, unknown>,
  data?: ContentPageBindingData | null,
): Record<string, unknown> {
  if (!data) return props;
  const bindings = props.bindings as ContentPageBlockBindings | undefined;
  if (!bindings) return props;

  let changed = false;
  const nextProps = { ...props };
  const targets = cpBindingTargets(blockType, props);
  const allowedTargets = new Set(targets.map((target) => target.key));
  for (const [target, fieldPath] of Object.entries(bindings)) {
    if (!fieldPath || !allowedTargets.has(target)) continue;
    const targetDefinition = targets.find((item) => item.key === target);
    const resolvedValue = resolveCpBindingValue(data, fieldPath);
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

/** Resolve configured bindings while preserving static props as fallbacks. */
export function resolveCpBlockBindings<T extends Block>(block: T, data?: ContentPageBindingData | null): T {
  const props = block.props as Record<string, unknown>;
  const nextProps = resolveCpPropsBindings(block.type, props, data);
  return nextProps === props ? block : ({ ...block, props: nextProps } as T);
}

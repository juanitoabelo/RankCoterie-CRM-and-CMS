import type { Block } from "@/lib/page-builder/types";
import { isValidUrl } from "@/lib/page-builder/validate";
import { sanitizeHtml } from "@/lib/style-guide";

export type ArticleBindingValueType = "text" | "richText" | "image" | "url" | "date";

export interface ArticleBindingField {
  key: string;
  label: string;
  valueType: ArticleBindingValueType;
}

export interface ArticleCustomFieldDefinition {
  key: string;
  label: string;
  valueType: ArticleBindingValueType;
}

export interface ArticleBindingData {
  title?: string | null;
  slug?: string | null;
  body?: string | null;
  metaDesc?: string | null;
  seoTitle?: string | null;
  focusKeyphrase?: string | null;
  author?: string | null;
  createdAt?: Date | string | null;
  publishedAt?: Date | string | null;
  featuredImage?: string | null;
  featuredImageAlt?: string | null;
  featuredImageCaption?: string | null;
  ogImage?: string | null;
  category?: { title?: string | null; slug?: string | null } | null;
  customFields?: Record<string, unknown>;
}

export interface ArticlePreviewData extends ArticleBindingData {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  metaDesc: string | null;
  ogImage: string | null;
  createdAt: Date | string;
}

export interface ArticleBlockBindings {
  [target: string]: string | undefined;
}

export const ARTICLE_BINDING_FIELDS: ArticleBindingField[] = [
  { key: "title", label: "Article title", valueType: "text" },
  { key: "body", label: "Article body", valueType: "richText" },
  { key: "metaDesc", label: "Meta description", valueType: "text" },
  { key: "seoTitle", label: "SEO title", valueType: "text" },
  { key: "focusKeyphrase", label: "Focus keyphrase", valueType: "text" },
  { key: "slug", label: "Article URL slug", valueType: "text" },
  { key: "articleUrl", label: "Article page URL", valueType: "url" },
  { key: "author", label: "Author", valueType: "text" },
  { key: "createdAt", label: "Created date", valueType: "date" },
  { key: "publishedAt", label: "Published date", valueType: "date" },
  { key: "category.title", label: "Category name", valueType: "text" },
  { key: "category.slug", label: "Category slug", valueType: "text" },
  { key: "featuredImage", label: "Featured image", valueType: "image" },
  { key: "featuredImageAlt", label: "Featured image alt text", valueType: "text" },
  { key: "featuredImageCaption", label: "Featured image caption", valueType: "text" },
  { key: "ogImage", label: "Open Graph image", valueType: "image" },
];

/** Standard content properties in blog templates that can read article data. */
const TARGETS_BY_BLOCK: Record<string, Record<string, { label: string; valueType: ArticleBindingValueType }>> = {
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
  blogPostGrid: { heading: { label: "Heading", valueType: "text" } },
  row: { bgImage: { label: "Background image", valueType: "image" } },
  column: { bgImage: { label: "Background image", valueType: "image" } },
  section: { bgImage: { label: "Background image", valueType: "image" } },
  articleHero: { bgImage: { label: "Background image", valueType: "image" } },
};

const ARRAY_TARGETS_BY_BLOCK: Record<string, Record<string, { label: string; valueType: ArticleBindingValueType }>> = {
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

export function articleBindingTargets(blockType: string, props?: Record<string, unknown>) {
  const targets = Object.entries(TARGETS_BY_BLOCK[blockType] ?? {}).map(([key, target]) => ({ key, ...target }));
  const arrayConfig = ARRAY_TARGETS_BY_BLOCK[blockType];
  if (!arrayConfig || !props) return targets;

  const collectionName = blockType === "slider" ? "slides" : "items";
  const collection = props[collectionName];
  if (!Array.isArray(collection)) return targets;

  for (const [index, _item] of collection.entries()) {
    for (const [field, target] of Object.entries(arrayConfig)) {
      const key = field ? `${collectionName}.${index}.${field}` : `${collectionName}.${index}`;
      targets.push({ key, label: `${target.label} (${index + 1})`, valueType: target.valueType });
    }
  }
  return targets;
}

export function articleBindingFieldsForTarget(
  targetType: ArticleBindingValueType,
  customFields: ArticleCustomFieldDefinition[] = [],
): ArticleBindingField[] {
  return [...ARTICLE_BINDING_FIELDS, ...customFields.map((field) => ({
    ...field,
    key: `customFields.${field.key}`,
  }))].filter((field) =>
    targetType === "richText"
      ? field.valueType === "richText" || field.valueType === "text"
      : targetType === "url"
        ? field.valueType === "url" || field.valueType === "text"
        : field.valueType === targetType,
  );
}

export function resolveArticleBindingValue(article: ArticleBindingData, fieldPath: string): string | null {
  if (fieldPath === "articleUrl") {
    return article.slug ? `/${article.slug}` : null;
  }
  const value = fieldPath.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || key === "__proto__" || key === "prototype" || key === "constructor") {
      return undefined;
    }
    return (current as Record<string, unknown>)[key];
  }, article);

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function resolveArticlePropsBindings(
  blockType: string,
  props: Record<string, unknown>,
  article?: ArticleBindingData,
): Record<string, unknown> {
  if (!article) return props;
  const bindings = props.bindings as ArticleBlockBindings | undefined;
  if (!bindings) return props;

  let changed = false;
  const nextProps = { ...props };
  const allowedTargets = new Set(articleBindingTargets(blockType, props).map((target) => target.key));
  for (const [target, fieldPath] of Object.entries(bindings)) {
    if (!fieldPath || !allowedTargets.has(target)) continue;
    const targetDefinition = articleBindingTargets(blockType, props).find((item) => item.key === target);
    const resolvedValue = resolveArticleBindingValue(article, fieldPath);
    const value = targetDefinition?.valueType === "richText"
      ? (resolvedValue === null ? null : sanitizeHtml(resolvedValue))
      : targetDefinition?.valueType === "url"
        ? (resolvedValue && isValidUrl(resolvedValue) ? resolvedValue : null)
        : resolvedValue;
    if (value === null || value === "") continue;
    const parts = target.split(".");
    let parent: Record<string, unknown> | unknown[] = nextProps;
    for (const part of parts.slice(0, -1)) {
      const current = (parent as Record<string, unknown>)[part];
      if (!current || typeof current !== "object") break;
      const clone = Array.isArray(current) ? [...current] : { ...current as Record<string, unknown> };
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

/** Resolve configured article bindings while preserving static props as fallbacks. */
export function resolveArticleBlockBindings<T extends Block>(block: T, article?: ArticleBindingData): T {
  const props = block.props as Record<string, unknown>;
  const nextProps = resolveArticlePropsBindings(block.type, props, article);
  return nextProps === props ? block : ({ ...block, props: nextProps } as T);
}

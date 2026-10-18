import type { BlockStyleSchema, StyleField } from "@/lib/page-builder/element-style";
import {
  BORDER_FIELDS,
  CONTAINER_FIELDS,
  MARGIN_FIELDS,
  PADDING_FIELDS,
  TYPOGRAPHY_FIELDS,
} from "@/lib/page-builder/element-style";

/**
 * Per-block Style tab schemas for blog-template-builder's own blocks
 * (post grid, sidebar, article content/hero). Renderers tag inner elements
 * with `data-lp-el="<key>"` and emit scoped CSS generated from
 * `props.elementStyles`.
 *
 * Standard blocks shared with the other builders live in
 * `lib/page-builder/standard-style-schemas.ts`.
 */

const HEADINGS = TYPOGRAPHY_FIELDS.filter((f) =>
  ["color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textAlign"].includes(f.key as string),
);

const BODY_TEXT = TYPOGRAPHY_FIELDS.filter((f) =>
  ["color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign"].includes(f.key as string),
);

function fields(...groups: Array<StyleField | StyleField[]>) {
  const out: StyleField[] = [];
  for (const group of groups) {
    if (Array.isArray(group)) out.push(...group);
    else out.push(group);
  }
  return out;
}

const CONTENT: StyleField[] = fields(BODY_TEXT, [
  { key: "backgroundColor", label: "Background", kind: "color" },
]);

/** Card surface: body text + background + border + padding. */
const CARD: StyleField[] = fields(CONTENT, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS);

export const BLOG_BLOCK_STYLE_SCHEMAS: Record<string, BlockStyleSchema> = {
  blogPostGrid: {
    blockType: "blogPostGrid",
    blockLabel: "Post Grid",
    // Delegates rendering to the shared `BlogPostGridFrontend`, whose internals
    // are not taggable from here — so only the block container is styleable.
    elements: [{ key: "container", label: "Grid container", fields: CONTAINER_FIELDS }],
  },
  blogSidebar: {
    blockType: "blogSidebar",
    blockLabel: "Sidebar",
    elements: [
      { key: "container", label: "Sidebar container", fields: CONTAINER_FIELDS },
      { key: "widget", label: "Widget", fields: CARD },
      { key: "widgetHeading", label: "Widget heading", fields: HEADINGS },
      { key: "link", label: "Link", fields: fields(CONTENT, ...PADDING_FIELDS.slice(0, 1)) },
      { key: "chip", label: "Tag chip", fields: fields(BODY_TEXT, { key: "backgroundColor", label: "Background", kind: "color" }, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)) },
      { key: "control", label: "Search control", fields: fields(BODY_TEXT, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)) },
    ],
  },
  articleContent: {
    blockType: "articleContent",
    blockLabel: "Article Content",
    elements: [
      { key: "container", label: "Content container", fields: CONTAINER_FIELDS },
      { key: "category", label: "Category badge", fields: fields(BODY_TEXT, { key: "backgroundColor", label: "Background", kind: "color" }, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)) },
      { key: "title", label: "Title", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "meta", label: "Meta row", fields: BODY_TEXT },
      { key: "image", label: "Featured image", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "content", label: "Article body", fields: fields(CONTENT, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "share", label: "Share row", fields: fields(BODY_TEXT, ...PADDING_FIELDS.slice(0, 1)) },
      { key: "nav", label: "Prev / next nav", fields: BODY_TEXT },
    ],
  },
  articleHero: {
    blockType: "articleHero",
    blockLabel: "Article Hero",
    elements: [
      { key: "container", label: "Hero container", fields: CONTAINER_FIELDS },
      { key: "breadcrumb", label: "Breadcrumb", fields: BODY_TEXT },
      { key: "category", label: "Category badge", fields: fields(BODY_TEXT, { key: "backgroundColor", label: "Background", kind: "color" }, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)) },
      { key: "title", label: "Title", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "meta", label: "Author / date", fields: BODY_TEXT },
    ],
  },
};

export function getBlogBlockStyleSchema(blockType: string): BlockStyleSchema | undefined {
  return BLOG_BLOCK_STYLE_SCHEMAS[blockType];
}

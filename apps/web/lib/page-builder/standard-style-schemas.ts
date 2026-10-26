import type { BlockStyleSchema, StyleElementSchema, StyleField } from "@/lib/page-builder/element-style";
import {
  BORDER_FIELDS,
  CONTAINER_FIELDS,
  MARGIN_FIELDS,
  PADDING_FIELDS,
  TYPOGRAPHY_FIELDS,
} from "@/lib/page-builder/element-style";

/**
 * Per-block Style tab schemas for the standard (non builder-specific) blocks
 * that every content builder shares: heading, text, image, button, hero,
 * marketing/media blocks…
 *
 * These blocks are edited through the shared `BlockEditor`, so one schema set
 * gives every builder a consistent Style tab. Renderers tag inner elements with
 * `data-lp-el="<key>"` and emit scoped CSS generated from `props.elementStyles`.
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

/** A single styleable "content" region: typography + a light background. */
const CONTENT: StyleField[] = fields(BODY_TEXT, [
  { key: "backgroundColor", label: "Background", kind: "color" },
]);

/**
 * Style schema for the content-slider family. Every slider exposes the same
 * core parts (container, slide/card, image, caption) and opts into the extra
 * parts its content type actually renders (title, meta, badge, button).
 */
function sliderSchema(
  blockType: string,
  blockLabel: string,
  opts: { title?: boolean; button?: boolean } = {},
): BlockStyleSchema {
  const elements: StyleElementSchema[] = [
    { key: "container", label: "Container", fields: CONTAINER_FIELDS },
    { key: "item", label: "Slide card", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
    { key: "image", label: "Slide image", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
    { key: "caption", label: "Slide caption", fields: BODY_TEXT },
  ];
  if (opts.title) elements.push({ key: "title", label: "Slide title", fields: HEADINGS });
  if (opts.button) elements.push({ key: "button", label: "Slide button", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) });
  return { blockType, blockLabel, elements };
}

export const STANDARD_BLOCK_STYLE_SCHEMAS: Record<string, BlockStyleSchema> = {
  heading: {
    blockType: "heading",
    blockLabel: "Heading",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Heading text", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
    ],
  },
  text: {
    blockType: "text",
    blockLabel: "Text",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Body content", fields: fields(CONTENT, [...MARGIN_FIELDS.slice(0, 1)]) },
    ],
  },
  image: {
    blockType: "image",
    blockLabel: "Image",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "image", label: "Image", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "caption", label: "Caption", fields: BODY_TEXT },
    ],
  },
  button: {
    blockType: "button",
    blockLabel: "Button",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "button", label: "Button", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
    ],
  },
  hero: {
    blockType: "hero",
    blockLabel: "Hero",
    elements: [
      { key: "container", label: "Hero container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
    ],
  },
  list: {
    blockType: "list",
    blockLabel: "List",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "item", label: "List item", fields: BODY_TEXT },
      { key: "list", label: "List wrapper", fields: fields(CONTENT, ...PADDING_FIELDS) },
    ],
  },
  iconList: {
    blockType: "iconList",
    blockLabel: "Icon List",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "item", label: "List item", fields: CONTENT },
    ],
  },
  spacer: {
    blockType: "spacer",
    blockLabel: "Spacer",
    elements: [{ key: "container", label: "Spacer", fields: [...MARGIN_FIELDS, ...PADDING_FIELDS] }],
  },
  divider: {
    blockType: "divider",
    blockLabel: "Divider",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "rule", label: "Rule", fields: [...BORDER_FIELDS.slice(0, 3)] },
    ],
  },
  embed: {
    blockType: "embed",
    blockLabel: "Embed",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Embedded content", fields: CONTENT },
    ],
  },
  video: {
    blockType: "video",
    blockLabel: "Video",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "frame", label: "Video frame", fields: [...BORDER_FIELDS, { key: "minHeight", label: "Min height", kind: "number", min: 0, max: 1000 }] },
    ],
  },
  googleMap: {
    blockType: "googleMap",
    blockLabel: "Map",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "frame", label: "Map frame", fields: [...BORDER_FIELDS, { key: "minHeight", label: "Min height", kind: "number", min: 0, max: 1000 }] },
    ],
  },
  slider: {
    blockType: "slider",
    blockLabel: "Slider",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "item", label: "Slide", fields: fields(BODY_TEXT, ...BORDER_FIELDS) },
      { key: "caption", label: "Slide caption", fields: BODY_TEXT },
    ],
  },
  blogArticleSlider: sliderSchema("blogArticleSlider", "Blog/Article Slider", { title: true, button: true }),
  productSlider: sliderSchema("productSlider", "Product Slider", { title: true, button: true }),
  listingSlider: sliderSchema("listingSlider", "Directory Listing Slider", { title: true }),
  companySlider: sliderSchema("companySlider", "Company Listing Slider", { title: true, button: true }),
  geoCategorySlider: sliderSchema("geoCategorySlider", "Geo Category Slider", { title: true }),
  sectionSlider: sliderSchema("sectionSlider", "Section Slider", { title: true, button: true }),
  topicSubTopicSlider: sliderSchema("topicSubTopicSlider", "Topic & Sub Topic Slider", { title: true }),
  imageSlider: sliderSchema("imageSlider", "Image Slider", { title: true }),
  videoSlider: sliderSchema("videoSlider", "Video Slider", { title: true, button: true }),
  cta: {
    blockType: "cta",
    blockLabel: "Call To Action",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "body", label: "Body", fields: BODY_TEXT },
      { key: "button", label: "Button", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
    ],
  },
  features: {
    blockType: "features",
    blockLabel: "Features",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "item", label: "Feature item", fields: CONTENT },
    ],
  },
  faq: {
    blockType: "faq",
    blockLabel: "FAQ",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "item", label: "FAQ item", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
    ],
  },
  testimonial: {
    blockType: "testimonial",
    blockLabel: "Testimonial",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "item", label: "Quote card", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
      { key: "quote", label: "Quote text", fields: BODY_TEXT },
    ],
  },
  contentGrid: {
    blockType: "contentGrid",
    blockLabel: "Content Grid",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "content", label: "Grid content", fields: CONTENT },
    ],
  },
  productGrid: {
    blockType: "productGrid",
    blockLabel: "Product Grid",
    // Delegates rendering to the shared `ProductGridFrontend`, whose internals
    // are not taggable from here — so only the block container is styleable.
    elements: [{ key: "container", label: "Grid container", fields: CONTAINER_FIELDS }],
  },
};

/**
 * Style schemas for the shared content blocks (`shared-blocks/renderers.tsx`).
 *
 * Kept in their own map so the builder-specific coverage checks can iterate the
 * standard set independently; `getStandardBlockStyleSchema` resolves both.
 */
const HEADING_FIELD = fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]);
const CARD_FIELDS = fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS);
const BUTTON_FIELDS = fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS);

export const SHARED_BLOCK_STYLE_SCHEMAS: Record<string, BlockStyleSchema> = {
  pricing: {
    blockType: "pricing",
    blockLabel: "Pricing Table",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
      { key: "item", label: "Plan card", fields: CARD_FIELDS },
      { key: "button", label: "Plan button", fields: BUTTON_FIELDS },
    ],
  },
  leadForm: {
    blockType: "leadForm",
    blockLabel: "Contact / Lead Form",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
      { key: "form", label: "Form", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
      { key: "button", label: "Submit button", fields: BUTTON_FIELDS },
    ],
  },
  stats: {
    blockType: "stats",
    blockLabel: "Stats / Counters",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Stat item", fields: CONTENT },
    ],
  },
  logos: {
    blockType: "logos",
    blockLabel: "Logo Cloud",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Logo", fields: CARD_FIELDS },
    ],
  },
  tabs: {
    blockType: "tabs",
    blockLabel: "Tabs",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Tab content", fields: fields(CONTENT, ...PADDING_FIELDS) },
    ],
  },
  searchHero: {
    blockType: "searchHero",
    blockLabel: "Directory Search Hero",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
      { key: "button", label: "Search button", fields: BUTTON_FIELDS },
    ],
  },
  listingCategories: {
    blockType: "listingCategories",
    blockLabel: "Listing Categories Grid",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Category card", fields: CARD_FIELDS },
    ],
  },
  featuredListings: {
    blockType: "featuredListings",
    blockLabel: "Featured Listings",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Listing card", fields: CARD_FIELDS },
    ],
  },
  mapListings: {
    blockType: "mapListings",
    blockLabel: "Map + Listings",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Listing item", fields: CARD_FIELDS },
    ],
  },
  toc: {
    blockType: "toc",
    blockLabel: "Table of Contents",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "item", label: "Link", fields: BODY_TEXT },
    ],
  },
  relatedPosts: {
    blockType: "relatedPosts",
    blockLabel: "Related Posts",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Post card", fields: CARD_FIELDS },
    ],
  },
  authorBio: {
    blockType: "authorBio",
    blockLabel: "Author Bio",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "image", label: "Avatar", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "content", label: "Bio text", fields: CONTENT },
    ],
  },
  shareButtons: {
    blockType: "shareButtons",
    blockLabel: "Share Buttons",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: BODY_TEXT },
      { key: "item", label: "Network button", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
    ],
  },
  postMeta: {
    blockType: "postMeta",
    blockLabel: "Post Meta",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Meta text", fields: BODY_TEXT },
    ],
  },
  newsletter: {
    blockType: "newsletter",
    blockLabel: "Newsletter Signup",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
      { key: "button", label: "Subscribe button", fields: BUTTON_FIELDS },
    ],
  },
  productCategories: {
    blockType: "productCategories",
    blockLabel: "Product Categories Grid",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Category card", fields: CARD_FIELDS },
    ],
  },
  productSpotlight: {
    blockType: "productSpotlight",
    blockLabel: "Product Spotlight",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "image", label: "Product image", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "title", label: "Product title", fields: HEADINGS },
      { key: "button", label: "Product button", fields: BUTTON_FIELDS },
    ],
  },
  announcement: {
    blockType: "announcement",
    blockLabel: "Announcement Bar",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Announcement text", fields: BODY_TEXT },
      { key: "button", label: "Link", fields: BODY_TEXT },
    ],
  },
  breadcrumbs: {
    blockType: "breadcrumbs",
    blockLabel: "Breadcrumbs",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Breadcrumb trail", fields: BODY_TEXT },
    ],
  },
  socialLinks: {
    blockType: "socialLinks",
    blockLabel: "Social Links",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: BODY_TEXT },
      { key: "item", label: "Social icon", fields: fields(CONTENT, ...BORDER_FIELDS, ...PADDING_FIELDS) },
    ],
  },
  countdown: {
    blockType: "countdown",
    blockLabel: "Countdown Timer",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Time cell", fields: CARD_FIELDS },
    ],
  },
  gallery: {
    blockType: "gallery",
    blockLabel: "Gallery",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "item", label: "Image tile", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
    ],
  },
  steps: {
    blockType: "steps",
    blockLabel: "Steps / Timeline",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "item", label: "Step card", fields: CONTENT },
      {
        key: "badge",
        label: "Step number badge",
        fields: fields(
          [{ key: "backgroundColor", label: "Background", kind: "color" }],
          ...BORDER_FIELDS,
          ...PADDING_FIELDS,
        ),
      },
      { key: "number", label: "Step number", fields: BODY_TEXT },
      { key: "title", label: "Step title", fields: HEADINGS },
      { key: "description", label: "Step description", fields: BODY_TEXT },
      {
        key: "connector",
        label: "Connector line",
        fields: [
          { key: "backgroundColor", label: "Color", kind: "color" },
          { key: "minHeight", label: "Thickness", kind: "number", min: 1, max: 12 },
        ],
      },
    ],
  },
  shapeDivider: {
    blockType: "shapeDivider",
    blockLabel: "Decorative Divider",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "content", label: "Shape", fields: [{ key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
    ],
  },
  reviews: {
    blockType: "reviews",
    blockLabel: "Reviews / Rating Summary",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
      { key: "summary", label: "Rating summary", fields: CARD_FIELDS },
      { key: "item", label: "Review card", fields: CARD_FIELDS },
      { key: "quote", label: "Review text", fields: BODY_TEXT },
    ],
  },
  relatedListings: {
    blockType: "relatedListings",
    blockLabel: "Related / Nearby Listings",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
      { key: "item", label: "Listing card", fields: CARD_FIELDS },
      { key: "title", label: "Listing title", fields: HEADINGS },
    ],
  },
  businessInfo: {
    blockType: "businessInfo",
    blockLabel: "Business Info / Contact Card",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "card", label: "Card", fields: CARD_FIELDS },
      { key: "image", label: "Image", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "name", label: "Business name", fields: HEADINGS },
      { key: "hours", label: "Opening hours", fields: BODY_TEXT },
      { key: "details", label: "Contact details", fields: BODY_TEXT },
    ],
  },
  facetBar: {
    blockType: "facetBar",
    blockLabel: "Filters / Facet Bar",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "bar", label: "Filter bar", fields: CARD_FIELDS },
      { key: "group", label: "Filter group", fields: CONTENT },
    ],
  },
  comparisonTable: {
    blockType: "comparisonTable",
    blockLabel: "Comparison Table",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "table", label: "Table", fields: CARD_FIELDS },
      { key: "column", label: "Column header", fields: CONTENT },
      { key: "row", label: "Feature cell", fields: BODY_TEXT },
    ],
  },
  team: {
    blockType: "team",
    blockLabel: "Team Grid",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADING_FIELD },
      { key: "subheading", label: "Subheading", fields: BODY_TEXT },
      { key: "item", label: "Member card", fields: CARD_FIELDS },
      { key: "name", label: "Member name", fields: HEADINGS },
    ],
  },
};

export function getStandardBlockStyleSchema(blockType: string): BlockStyleSchema | undefined {
  return STANDARD_BLOCK_STYLE_SCHEMAS[blockType] ?? SHARED_BLOCK_STYLE_SCHEMAS[blockType];
}

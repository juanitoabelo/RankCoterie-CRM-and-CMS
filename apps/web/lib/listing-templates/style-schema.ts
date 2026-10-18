import type { BlockStyleSchema } from "@/lib/page-builder/element-style";
import {
  BACKGROUND_FIELDS,
  BORDER_FIELDS,
  CONTAINER_FIELDS,
  MARGIN_FIELDS,
  PADDING_FIELDS,
  TYPOGRAPHY_FIELDS,
} from "@/lib/page-builder/element-style";

/**
 * Per-block Style tab schemas for Company Listing custom landing page blocks.
 *
 * Each schema lists the elements of a block that can be styled from the Style
 * tab. The renderer tags those elements with `data-lp-el="<key>"` and emits
 * scoped CSS generated from `props.elementStyles`.
 */

const HEADINGS = TYPOGRAPHY_FIELDS.filter((f) =>
  ["color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textTransform", "textAlign"].includes(f.key as string),
);

const BODY_TEXT = TYPOGRAPHY_FIELDS.filter((f) =>
  ["color", "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign"].includes(f.key as string),
);

function fields(...groups: Array<Array<typeof TYPOGRAPHY_FIELDS[number]>>) {
  return groups.flat();
}

export const LISTING_BLOCK_STYLE_SCHEMAS: Record<string, BlockStyleSchema> = {
  listingHero: {
    blockType: "listingHero",
    blockLabel: "Listing Hero",
    elements: [
      { key: "container", label: "Hero container", description: "Wraps the whole hero block", fields: CONTAINER_FIELDS },
      { key: "cover", label: "Cover image", fields: [...BACKGROUND_FIELDS, { key: "borderRadius", label: "Radius", kind: "number", min: 0, max: 200 }, { key: "minHeight", label: "Height", kind: "number", min: 0, max: 800 }, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "avatar", label: "Logo / avatar", fields: [...BORDER_FIELDS, ...MARGIN_FIELDS.filter((f) => f.key === "marginBottom"), { key: "width", label: "Width", kind: "text", placeholder: "e.g. 96px" }] },
      { key: "title", label: "Title", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "subtitle", label: "Subtitle / company name", fields: fields(BODY_TEXT, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "summary", label: "Summary text", fields: BODY_TEXT },
      { key: "badges", label: "Badges", fields: [...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)] },
      { key: "contact", label: "Contact info row", fields: BODY_TEXT },
      { key: "address", label: "Address row", fields: BODY_TEXT },
    ],
  },
  listingAbout: {
    blockType: "listingAbout",
    blockLabel: "Listing About",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "content", label: "Body content", fields: BODY_TEXT },
    ],
  },
  listingDescription: {
    blockType: "listingDescription",
    blockLabel: "Listing Description",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "content", label: "Body content", fields: BODY_TEXT },
    ],
  },
  listingDetails: {
    blockType: "listingDetails",
    blockLabel: "Listing Details",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "grid", label: "Grid", fields: [{ key: "gap", label: "Gap", kind: "number", min: 0, max: 64 }] },
      { key: "item", label: "Detail item", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)] },
    ],
  },
  listingGallery: {
    blockType: "listingGallery",
    blockLabel: "Listing Gallery",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "image", label: "Gallery image", fields: [...BORDER_FIELDS.slice(2), { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "grid", label: "Grid", fields: [{ key: "gap", label: "Gap", kind: "number", min: 0, max: 64 }] },
    ],
  },
  listingMap: {
    blockType: "listingMap",
    blockLabel: "Listing Map",
    elements: [
      { key: "container", label: "Map container", fields: CONTAINER_FIELDS },
      { key: "map", label: "Map embed frame", fields: [...BORDER_FIELDS, { key: "minHeight", label: "Min height", kind: "number", min: 0, max: 1000 }] },
    ],
  },
  listingVideo: {
    blockType: "listingVideo",
    blockLabel: "Listing Video",
    elements: [
      { key: "container", label: "Video container", fields: CONTAINER_FIELDS },
      { key: "video", label: "Video frame", fields: BORDER_FIELDS },
    ],
  },
  listingReviews: {
    blockType: "listingReviews",
    blockLabel: "Listing Reviews",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "item", label: "Review item", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
    ],
  },
  listingReviewForm: {
    blockType: "listingReviewForm",
    blockLabel: "Review Form",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "form", label: "Form fields", fields: [...BODY_TEXT, ...PADDING_FIELDS, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4)] },
      { key: "button", label: "Submit button", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
    ],
  },
  listingContactForm: {
    blockType: "listingContactForm",
    blockLabel: "Contact Form",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Title", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "form", label: "Form fields", fields: [...BODY_TEXT, ...PADDING_FIELDS, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4)] },
      { key: "button", label: "Submit button", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
    ],
  },
  listingQuickFacts: {
    blockType: "listingQuickFacts",
    blockLabel: "Quick Facts",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "item", label: "Fact row", fields: [...BODY_TEXT, ...PADDING_FIELDS.slice(0, 2), { key: "gap", label: "Row gap", kind: "number", min: 0, max: 64 }] },
    ],
  },
  listingHours: {
    blockType: "listingHours",
    blockLabel: "Hours",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "day", label: "Day row", fields: [...BODY_TEXT, ...PADDING_FIELDS.slice(0, 2), { key: "gap", label: "Row gap", kind: "number", min: 0, max: 64 }] },
    ],
  },
  listingAreas: {
    blockType: "listingAreas",
    blockLabel: "Areas Served",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "chip", label: "Area chip", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)] },
    ],
  },
  listingCategories: {
    blockType: "listingCategories",
    blockLabel: "Categories",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "chip", label: "Category chip", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)] },
    ],
  },
  listingSocial: {
    blockType: "listingSocial",
    blockLabel: "Social Links",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "link", label: "Social link", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)] },
    ],
  },
  listingClaim: {
    blockType: "listingClaim",
    blockLabel: "Claim Business",
    elements: [
      { key: "container", label: "Card container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "body", label: "Body text", fields: BODY_TEXT },
      { key: "button", label: "Claim button", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS.slice(0, 1), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
    ],
  },
};

export function getListingBlockStyleSchema(blockType: string): BlockStyleSchema | undefined {
  return LISTING_BLOCK_STYLE_SCHEMAS[blockType];
}

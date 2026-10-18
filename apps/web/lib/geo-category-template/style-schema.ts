import type { BlockStyleSchema } from "@/lib/page-builder/element-style";
import {
  BORDER_FIELDS,
  CONTAINER_FIELDS,
  MARGIN_FIELDS,
  PADDING_FIELDS,
  TYPOGRAPHY_FIELDS,
} from "@/lib/page-builder/element-style";

/**
 * Per-block Style tab schemas for Directory (Geo Category) custom template
 * blocks. Renderers tag inner elements with `data-lp-el="<key>"` and emit
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

export const GEO_BLOCK_STYLE_SCHEMAS: Record<string, BlockStyleSchema> = {
  geoHero: {
    blockType: "geoHero",
    blockLabel: "Category Hero",
    elements: [
      { key: "container", label: "Hero container", description: "Wraps the whole hero block", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "description", label: "Description", fields: BODY_TEXT },
      { key: "image", label: "Hero image", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "breadcrumb", label: "Breadcrumb", fields: BODY_TEXT },
    ],
  },
  geoContent: {
    blockType: "geoContent",
    blockLabel: "Category Content",
    elements: [
      { key: "container", label: "Content container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "content", label: "Body content", fields: BODY_TEXT },
    ],
  },
  geoRegionNav: {
    blockType: "geoRegionNav",
    blockLabel: "State Links",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "link", label: "Region link", fields: [...BODY_TEXT, ...PADDING_FIELDS.slice(0, 2), { key: "gap", label: "Gap", kind: "number", min: 0, max: 64 }] },
    ],
  },
  geoListings: {
    blockType: "geoListings",
    blockLabel: "Listings",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "grid", label: "Card grid", fields: [{ key: "gap", label: "Grid gap", kind: "number", min: 0, max: 64 }] },
      { key: "card", label: "Listing card", fields: [...BODY_TEXT, ...CONTAINER_FIELDS.slice(0, 10)] },
      { key: "image", label: "Card image", fields: [...BORDER_FIELDS.slice(2), { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
    ],
  },
  geoFaq: {
    blockType: "geoFaq",
    blockLabel: "Category FAQ",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "item", label: "FAQ item", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS(), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
    ],
  },
  geoRegionChips: {
    blockType: "geoRegionChips",
    blockLabel: "City Chips",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "chip", label: "City chip", fields: [...BODY_TEXT, { key: "backgroundColor", label: "Background", kind: "color" }, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)] },
    ],
  },
  geoFilterBar: {
    blockType: "geoFilterBar",
    blockLabel: "Filter Bar",
    elements: [
      { key: "container", label: "Filter bar container", fields: CONTAINER_FIELDS },
      { key: "control", label: "Filter control", fields: [...BODY_TEXT, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 1)] },
    ],
  },
  geoSidebar: {
    blockType: "geoSidebar",
    blockLabel: "Sidebar",
    elements: [
      { key: "container", label: "Sidebar container", fields: CONTAINER_FIELDS },
      { key: "widget", label: "Sidebar widget", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS(), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
      { key: "widgetHeading", label: "Widget heading", fields: HEADINGS },
    ],
  },
};

// Local helper so BACKGROUND_FIELDS imports stay consistent with listing schema.
function BACKGROUND_FIELDS() {
  return [
    { key: "backgroundColor" as const, label: "Background", kind: "color" as const },
    { key: "backgroundImage" as const, label: "Image URL", kind: "text" as const, placeholder: "https://…" },
  ];
}

export function getGeoBlockStyleSchema(blockType: string): BlockStyleSchema | undefined {
  return GEO_BLOCK_STYLE_SCHEMAS[blockType];
}

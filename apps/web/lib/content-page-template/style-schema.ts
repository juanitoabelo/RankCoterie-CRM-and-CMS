import type { BlockStyleSchema } from "@/lib/page-builder/element-style";
import {
  BORDER_FIELDS,
  CONTAINER_FIELDS,
  MARGIN_FIELDS,
  PADDING_FIELDS,
  TYPOGRAPHY_FIELDS,
} from "@/lib/page-builder/element-style";

/**
 * Per-block Style tab schemas for Content Page (Topic / SubTopic) custom
 * template blocks. Renderers tag inner elements with `data-lp-el="<key>"` and
 * emit scoped CSS generated from `props.elementStyles`.
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

function BACKGROUND_FIELDS() {
  return [
    { key: "backgroundColor" as const, label: "Background", kind: "color" as const },
    { key: "backgroundImage" as const, label: "Image URL", kind: "text" as const, placeholder: "https://…" },
  ];
}

export const CP_BLOCK_STYLE_SCHEMAS: Record<string, BlockStyleSchema> = {
  cpHero: {
    blockType: "cpHero",
    blockLabel: "Page Hero",
    elements: [
      { key: "container", label: "Hero container", description: "Wraps the whole hero block", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "description", label: "Description", fields: BODY_TEXT },
      { key: "image", label: "Hero image", fields: [...BORDER_FIELDS, { key: "opacity", label: "Opacity", kind: "number", min: 0, max: 1, step: 0.05 }] },
      { key: "breadcrumb", label: "Breadcrumb", fields: BODY_TEXT },
      { key: "author", label: "Author", fields: BODY_TEXT },
    ],
  },
  cpContent: {
    blockType: "cpContent",
    blockLabel: "Page Content",
    elements: [
      { key: "container", label: "Content container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "content", label: "Body content", fields: BODY_TEXT },
    ],
  },
  cpSections: {
    blockType: "cpSections",
    blockLabel: "Sections List",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: fields(HEADINGS, [...MARGIN_FIELDS.slice(0, 1)]) },
      { key: "item", label: "Section item", fields: BODY_TEXT },
      { key: "itemHeading", label: "Section heading", fields: HEADINGS },
    ],
  },
  cpSidebar: {
    blockType: "cpSidebar",
    blockLabel: "Sidebar",
    elements: [
      { key: "container", label: "Sidebar container", fields: CONTAINER_FIELDS },
      { key: "widget", label: "Sidebar widget", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS(), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
      { key: "widgetHeading", label: "Widget heading", fields: HEADINGS },
    ],
  },
  topicGeoWidget: {
    blockType: "topicGeoWidget",
    blockLabel: "Geo Category Widget",
    elements: [
      { key: "container", label: "Widget container", fields: [...CONTAINER_FIELDS, ...BACKGROUND_FIELDS(), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
      { key: "heading", label: "Heading", fields: HEADINGS },
      { key: "description", label: "Description", fields: BODY_TEXT },
      { key: "link", label: "Location link", fields: [...BODY_TEXT, ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS.slice(0, 2)] },
    ],
  },
  topicSubTopics: {
    blockType: "topicSubTopics",
    blockLabel: "Related SubTopics",
    elements: [
      { key: "container", label: "Container", fields: CONTAINER_FIELDS },
      { key: "heading", label: "Heading", fields: HEADINGS },
      { key: "grid", label: "Card grid", fields: [{ key: "gap", label: "Grid gap", kind: "number", min: 0, max: 64 }] },
      { key: "card", label: "SubTopic card", fields: [...BODY_TEXT, ...BACKGROUND_FIELDS(), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
    ],
  },
  subtopicTopicLink: {
    blockType: "subtopicTopicLink",
    blockLabel: "Parent Topic Link",
    elements: [
      { key: "container", label: "Container", fields: [...CONTAINER_FIELDS, ...BACKGROUND_FIELDS(), ...BORDER_FIELDS.slice(0, 4), ...PADDING_FIELDS] },
      { key: "heading", label: "Label", fields: BODY_TEXT },
      { key: "link", label: "Topic link", fields: BODY_TEXT },
    ],
  },
};

export function getCpBlockStyleSchema(blockType: string): BlockStyleSchema | undefined {
  return CP_BLOCK_STYLE_SCHEMAS[blockType];
}

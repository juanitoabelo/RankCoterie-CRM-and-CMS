/**
 * Content Page Template Builder — Block Types
 *
 * Shared builder block system for custom single-page templates of Topic and
 * SubTopic content pages (`kind` = "topic" | "subtopic"). Extends the page
 * builder with content-page blocks (hero, content, sections list, geo widget,
 * sub-topic list, sidebar) and reuses the standard block library.
 */

import type {
  BlockBase,
  RowBlock,
  SectionBlock,
  HeroBlock,
  TextBlock,
  ImageBlock,
  CtaBlock,
  FeaturesBlock,
  ButtonBlock,
  EmbedBlock,
  FaqBlock,
  TestimonialBlock,
  SpacerBlock,
  DividerBlock,
  HeadingBlock,
  ListBlock,
  SliderBlock,
  ContentGridBlock,
  IconListBlock,
  GoogleMapBlock,
  ProductGridBlock,
  VideoBlock,
  StyleBreakpoints,
  RowLayout,
} from "../page-builder/types";
import { createBlock, ROW_LAYOUTS } from "../page-builder/types";

export type { SpacingValues } from "../spacing";
import type { SpacingValues } from "../spacing";

/** Kinds of content pages this template family renders. */
export type ContentPageKind = "topic" | "subtopic";

export const CONTENT_PAGE_KINDS: ContentPageKind[] = ["topic", "subtopic"];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Container Settings                                                         */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface ContainerSettings {
  width: "full" | "boxed";
  maxWidth: number;
  minHeight: number;
  direction: "row" | "column";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems: "stretch" | "flex-start" | "center" | "flex-end";
  gapCol: number;
  gapRow: number;
  wrap: "nowrap" | "wrap";

  bgColor?: string;
  bgImage?: string;
  bgPosition?: string;
  bgSize?: string;
  bgRepeat?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  borderStyle: "none" | "solid" | "dashed" | "dotted";
  borderWidth: number;
  borderColor?: string;
  borderRadius: number;

  margin: SpacingValues;
  padding: SpacingValues;
  zindex: number;
  cssId: string;
  cssClasses: string;
}

export const DEFAULT_CONTAINER_SETTINGS: ContainerSettings = {
  width: "full",
  maxWidth: 1200,
  minHeight: 0,
  direction: "column",
  justifyContent: "flex-start",
  alignItems: "stretch",
  gapCol: 0,
  gapRow: 0,
  wrap: "nowrap",
  bgColor: undefined,
  bgImage: undefined,
  bgPosition: "center center",
  bgSize: "cover",
  bgRepeat: "no-repeat",
  overlayColor: undefined,
  overlayOpacity: 0,
  borderStyle: "none",
  borderWidth: 0,
  borderColor: undefined,
  borderRadius: 0,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  zindex: 0,
  cssId: "",
  cssClasses: "",
};

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Content-Page-Specific Block Types                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

/** Hero bound to the rendered page title / description / featured image. */
export interface CpHeroBlock extends BlockBase {
  type: "cpHero";
  props: {
    layout: "standard" | "centered";
    showImage: boolean;
    showBreadcrumb: boolean;
    showDescription: boolean;
    showAuthor: boolean;
    heading?: string;
    subheading?: string;
    image?: string;
    bgColor?: string;
    textColor?: string;
    style?: StyleBreakpoints;
  };
}

/** Rich body content bound to the page content field. */
export interface CpContentBlock extends BlockBase {
  type: "cpContent";
  props: {
    showHeading: boolean;
    heading?: string;
    content?: string;
    maxWidth?: number;
    style?: StyleBreakpoints;
  };
}

/** Renders the page's section list (Topic sections / SubTopic linked sections). */
export interface CpSectionsBlock extends BlockBase {
  type: "cpSections";
  props: {
    showHeading: boolean;
    heading?: string;
    emptyMessage?: string;
    style?: StyleBreakpoints;
  };
}

/** Sidebar with configurable widgets (kind-dependent options). */
export type CpSidebarWidget =
  | { type: "sections"; heading?: string }
  | { type: "subtopics"; heading?: string; limit?: number }
  | { type: "geoStates"; heading?: string; limit?: number }
  | { type: "topic"; heading?: string }
  | { type: "custom"; heading?: string; content?: string };

export interface CpSidebarBlock extends BlockBase {
  type: "cpSidebar";
  props: {
    widgets: CpSidebarWidget[];
    width?: number;
    style?: StyleBreakpoints;
  };
}

/** Topic-only: embeds the linked GeoCategory widget (state links + browse link). */
export interface TopicGeoWidgetBlock extends BlockBase {
  type: "topicGeoWidget";
  props: {
    heading?: string;
    showDescription: boolean;
    showCount: boolean;
    columns: 2 | 3 | 4;
    showBrowseLink: boolean;
    emptyMessage?: string;
    style?: StyleBreakpoints;
  };
}

/** Topic-only: list of related SubTopics under the topic. */
export interface TopicSubTopicsBlock extends BlockBase {
  type: "topicSubTopics";
  props: {
    heading?: string;
    limit?: number;
    columnsDesktop: 1 | 2 | 3;
    showDescription: boolean;
    emptyMessage?: string;
    style?: StyleBreakpoints;
  };
}

/** SubTopic-only: breadcrumb / callout linking back to the parent Topic. */
export interface SubTopicTopicLinkBlock extends BlockBase {
  type: "subtopicTopicLink";
  props: {
    heading?: string;
    showDescription?: boolean;
    style?: StyleBreakpoints;
  };
}

export type ContentPageTemplateBlock =
  | CpHeroBlock
  | CpContentBlock
  | CpSectionsBlock
  | CpSidebarBlock
  | TopicGeoWidgetBlock
  | TopicSubTopicsBlock
  | SubTopicTopicLinkBlock
  | HeroBlock
  | TextBlock
  | ImageBlock
  | CtaBlock
  | FeaturesBlock
  | ButtonBlock
  | EmbedBlock
  | FaqBlock
  | TestimonialBlock
  | SpacerBlock
  | DividerBlock
  | HeadingBlock
  | ListBlock
  | SliderBlock
  | ContentGridBlock
  | IconListBlock
  | GoogleMapBlock
  | ProductGridBlock
  | VideoBlock
  | RowBlock
  | SectionBlock;

export type ContentPageTemplateBlockType = ContentPageTemplateBlock["type"];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Allowed Block Types                                                        */
/* ──────────────────────────────────────────────────────────────────────────── */

export const CP_SHARED_LEAF_BLOCK_TYPES: ContentPageTemplateBlockType[] = [
  "cpHero",
  "cpContent",
  "cpSections",
  "cpSidebar",
  // Standard blocks
  "hero",
  "text",
  "image",
  "cta",
  "features",
  "button",
  "embed",
  "faq",
  "testimonial",
  "spacer",
  "divider",
  "heading",
  "list",
  "slider",
  "contentGrid",
  "iconList",
  "googleMap",
  "productGrid",
  "video",
];

export const TOPIC_SPECIFIC_BLOCK_TYPES: ContentPageTemplateBlockType[] = [
  "topicGeoWidget",
  "topicSubTopics",
];

export const SUBTOPIC_SPECIFIC_BLOCK_TYPES: ContentPageTemplateBlockType[] = [
  "subtopicTopicLink",
];

export function cpLeafBlockTypes(kind: ContentPageKind): ContentPageTemplateBlockType[] {
  return [
    ...(kind === "topic" ? TOPIC_SPECIFIC_BLOCK_TYPES : SUBTOPIC_SPECIFIC_BLOCK_TYPES),
    ...CP_SHARED_LEAF_BLOCK_TYPES,
  ];
}

export const CP_CONTAINER_BLOCK_TYPES: ContentPageTemplateBlockType[] = ["row", "section"];

export const CP_TEMPLATE_ROW_LAYOUTS: RowLayout[] = ROW_LAYOUTS;

/** Default variation tags stored on ContentPageTemplate.layout. */
export type CpTemplateLayout = "FULLWIDTH" | "SIDEBAR";

export function isContentPageKind(value: string): value is ContentPageKind {
  return value === "topic" || value === "subtopic";
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Factory Functions                                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export function createContentPageTemplateBlock(
  type: ContentPageTemplateBlockType,
  kind: ContentPageKind,
): ContentPageTemplateBlock {
  switch (type) {
    case "cpHero":
      return {
        id: crypto.randomUUID(),
        type: "cpHero",
        props: {
          layout: "standard",
          showImage: true,
          showBreadcrumb: true,
          showDescription: true,
          showAuthor: true,
        },
      } as CpHeroBlock;

    case "cpContent":
      return {
        id: crypto.randomUUID(),
        type: "cpContent",
        props: { showHeading: false, heading: "Overview", content: "", maxWidth: 760 },
      } as CpContentBlock;

    case "cpSections":
      return {
        id: crypto.randomUUID(),
        type: "cpSections",
        props: {
          showHeading: true,
          heading: kind === "topic" ? "More on this topic" : "In this section",
        },
      } as CpSectionsBlock;

    case "cpSidebar":
      return {
        id: crypto.randomUUID(),
        type: "cpSidebar",
        props: {
          widgets: kind === "topic"
            ? [
                { type: "sections", heading: "On this page" },
                { type: "subtopics", heading: "Related SubTopics", limit: 5 },
                { type: "geoStates", heading: "Programs by state", limit: 8 },
                { type: "custom", heading: "About", content: "<p>Hand-reviewed content, updated regularly.</p>" },
              ]
            : [
                { type: "sections", heading: "In this section" },
                { type: "topic", heading: "Part of" },
                { type: "custom", heading: "About", content: "<p>Hand-reviewed content, updated regularly.</p>" },
              ],
          width: 320,
        },
      } as CpSidebarBlock;

    case "topicGeoWidget":
      return {
        id: crypto.randomUUID(),
        type: "topicGeoWidget",
        props: {
          heading: "Programs by location",
          showDescription: true,
          showCount: false,
          columns: 3,
          showBrowseLink: true,
        },
      } as TopicGeoWidgetBlock;

    case "topicSubTopics":
      return {
        id: crypto.randomUUID(),
        type: "topicSubTopics",
        props: {
          heading: "Related SubTopics",
          limit: 12,
          columnsDesktop: 2,
          showDescription: true,
        },
      } as TopicSubTopicsBlock;

    case "subtopicTopicLink":
      return {
        id: crypto.randomUUID(),
        type: "subtopicTopicLink",
        props: { heading: "Part of", showDescription: false },
      } as SubTopicTopicLinkBlock;

    default:
      return createBlock(type) as unknown as ContentPageTemplateBlock;
  }
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Default Template Variations (Fullwidth + Right Sidebar)                    */
/* ──────────────────────────────────────────────────────────────────────────── */

function heroBlock(id: string, kind: ContentPageKind): Record<string, unknown> {
  return {
    id,
    type: "cpHero",
    props: {
      layout: "standard",
      showImage: true,
      showBreadcrumb: kind === "subtopic",
      showDescription: true,
      showAuthor: kind === "subtopic",
    },
  };
}

function contentBlock(id: string): Record<string, unknown> {
  return {
    id,
    type: "cpContent",
    props: { showHeading: false, heading: "Overview", content: "", maxWidth: 760 },
  };
}

function sectionsBlock(id: string, kind: ContentPageKind): Record<string, unknown> {
  return {
    id,
    type: "cpSections",
    props: {
      showHeading: true,
      heading: kind === "topic" ? "More on this topic" : "In this section",
    },
  };
}

function topicExtrasBlocks(): Record<string, unknown>[] {
  return [
    {
      id: "cp-default-geo-widget",
      type: "topicGeoWidget",
      props: { heading: "Programs by location", showDescription: true, showCount: false, columns: 3, showBrowseLink: true },
    },
    {
      id: "cp-default-subtopics",
      type: "topicSubTopics",
      props: { heading: "Related SubTopics", limit: 9, columnsDesktop: 3, showDescription: true },
    },
  ];
}

function subtopicExtrasBlocks(): Record<string, unknown>[] {
  return [
    {
      id: "cp-default-topic-link",
      type: "subtopicTopicLink",
      props: { heading: "Part of", showDescription: false },
    },
  ];
}

function sidebarBlock(id: string, kind: ContentPageKind, width: number): Record<string, unknown> {
  return {
    id,
    type: "cpSidebar",
    props: {
      width,
      widgets: kind === "topic"
        ? [
            { type: "sections", heading: "On this page" },
            { type: "subtopics", heading: "Related SubTopics", limit: 5 },
            { type: "geoStates", heading: "Programs by state", limit: 8 },
            { type: "custom", heading: "About", content: "<p>Hand-reviewed content, updated regularly.</p>" },
          ]
        : [
            { type: "sections", heading: "In this section" },
            { type: "topic", heading: "Part of" },
            { type: "custom", heading: "About", content: "<p>Hand-reviewed content, updated regularly.</p>" },
          ],
    },
  };
}

function sectionShell(
  id: string,
  innerBlocks: Record<string, unknown>[],
): Record<string, unknown> {
  return {
    id,
    type: "section",
    props: {
      rows: [
        {
          id: `${id}-row`,
          type: "row",
          props: {
            columns: [{ id: `${id}-col`, span: 12, blocks: innerBlocks }],
            gap: 24,
            align: "stretch",
            stackOnMobile: true,
            paddingY: 10,
            width: "full",
            fullWidth: true,
          },
        },
      ],
      width: "boxed",
      maxWidth: 1200,
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 10,
      paddingBottom: 10,
    },
  };
}

export function defaultFullwidthBlocks(kind: ContentPageKind): ContentPageTemplateBlock[] {
  const extras = kind === "topic" ? topicExtrasBlocks() : subtopicExtrasBlocks();
  return [
    sectionShell("cp-default-fullwidth-section", [
      heroBlock("cp-default-fullwidth-hero", kind),
      contentBlock("cp-default-fullwidth-content"),
      sectionsBlock("cp-default-fullwidth-sections", kind),
      ...extras,
    ]),
  ] as unknown as ContentPageTemplateBlock[];
}

export function defaultSidebarBlocks(kind: ContentPageKind): ContentPageTemplateBlock[] {
  const extras = kind === "topic" ? topicExtrasBlocks().slice(0, 1) : subtopicExtrasBlocks();
  const section = sectionShell("cp-default-sidebar-section", []);
  // Replace the single column with a main (8) + sidebar (4) split.
  const props = section.props as { rows: Array<{ props: { columns: unknown[] } }> };
  props.rows[0].props.columns = [
    {
      id: "cp-default-sidebar-col-main",
      span: 8,
      blocks: [
        heroBlock("cp-default-sidebar-hero", kind),
        contentBlock("cp-default-sidebar-content"),
        sectionsBlock("cp-default-sidebar-sections", kind),
        ...extras,
      ],
    },
    {
      id: "cp-default-sidebar-col-side",
      span: 4,
      blocks: [sidebarBlock("cp-default-sidebar-sidebar", kind, 320)],
    },
  ];
  return [section] as unknown as ContentPageTemplateBlock[];
}

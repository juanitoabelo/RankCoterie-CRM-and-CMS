/**
 * Page Layout Builder — Block Types
 *
 * Extends the page builder block system for page-level layout templates
 * with container settings (similar to Header/Footer builder).
 */

import type {
  BlockBase,
  Block,
  BlockType,
  BlockDefinition,
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
  StyleBreakpoints,
  RowLayout,
} from "../page-builder/types";
import { pickRowLayouts } from "../page-builder/types";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Container Settings (wraps entire page layout)                              */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface SpacingValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ContainerSettings {
  // Layout
  width: "full" | "boxed";
  maxWidth: number;
  minHeight: number;
  direction: "row" | "column";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems: "stretch" | "flex-start" | "center" | "flex-end";
  gapCol: number;
  gapRow: number;
  wrap: "nowrap" | "wrap";

  // Style
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

  // Advanced
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
/*  Page Layout Block Union                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export type PageLayoutBlock =
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
  | RowBlock
  | SectionBlock;

export type PageLayoutBlockType = PageLayoutBlock["type"];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Helper Functions                                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export function isPageLayoutBlock(block: { type: string }): block is PageLayoutBlock {
  return PAGE_LAYOUT_LEAF_BLOCK_TYPES.includes(block.type as PageLayoutBlockType);
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  All Allowed Block Types (Page Layout Builder)                              */
/* ──────────────────────────────────────────────────────────────────────────── */

export const PAGE_LAYOUT_LEAF_BLOCK_TYPES: PageLayoutBlockType[] = [
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
];

export const PAGE_LAYOUT_CONTAINER_BLOCK_TYPES: PageLayoutBlockType[] = [
  "row",
  "section",
];

export const ALL_PAGE_LAYOUT_BLOCK_TYPES: PageLayoutBlockType[] = [
  ...PAGE_LAYOUT_CONTAINER_BLOCK_TYPES,
  ...PAGE_LAYOUT_LEAF_BLOCK_TYPES,
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Row Layouts (page-specific presets)                                        */
/* ──────────────────────────────────────────────────────────────────────────── */

export const PAGE_LAYOUT_ROW_LAYOUTS: RowLayout[] = pickRowLayouts([
  "two-halves",
  "logo-nav",
  "nav-logo",
  "three",
  "logo-center-nav",
  "footer-four",
]);

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Factory Functions                                                         */
/* ──────────────────────────────────────────────────────────────────────────── */

export function createPageLayoutBlock(type: PageLayoutBlockType): PageLayoutBlock {
  // Delegate to page builder's createBlock for all types (no specialized blocks)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createBlock } = require("../page-builder/types") as typeof import("../page-builder/types");
  return createBlock(type) as PageLayoutBlock;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Default Blocks (Fallback when no layout template is assigned)             */
/* ──────────────────────────────────────────────────────────────────────────── */

export const DEFAULT_PAGE_LAYOUT_BLOCKS: PageLayoutBlock[] = [
  {
    id: "default-page-section",
    type: "section",
    props: {
      rows: [
        {
          id: "default-page-row",
          type: "row",
          props: {
            columns: [
              {
                id: "default-page-col",
                span: 12,
                blocks: [
                  {
                    id: "default-page-heading",
                    type: "heading",
                    props: {
                      text: "Page Title",
                      level: 1,
                      align: "left",
                    },
                  },
                ],
              },
            ],
            gap: 24,
            align: "stretch",
            stackOnMobile: true,
            paddingY: 10,
            width: "full",
            fullWidth: true,
          },
        },
      ],
      width: "full",
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 10,
      paddingBottom: 10,
    },
  },
];

/**
 * Geo Category Template Builder — Block Types
 *
 * Extends the page builder block system for GeoCategory single-page templates
 * with specialized blocks for directory content (hero, region nav, listings,
 * FAQ, sidebar widgets).
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

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Container Settings (wraps the entire geo category template)                */
/* ──────────────────────────────────────────────────────────────────────────── */

export type { SpacingValues } from "../spacing";
import type { SpacingValues } from "../spacing";

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
/*  Geo-Specific Block Types                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface GeoHeroBlock extends BlockBase {
  type: "geoHero";
  props: {
    layout: "standard" | "centered";
    showImage: boolean;
    showBreadcrumb: boolean;
    showDescription: boolean;
    heading?: string;
    subheading?: string;
    image?: string;
    bgColor?: string;
    textColor?: string;
    style?: StyleBreakpoints;
  };
}

export interface GeoContentBlock extends BlockBase {
  type: "geoContent";
  props: {
    showHeading: boolean;
    heading?: string;
    content?: string;
    maxWidth?: number;
    style?: StyleBreakpoints;
  };
}

export interface GeoRegionNavBlock extends BlockBase {
  type: "geoRegionNav";
  props: {
    heading?: string;
    columns: 2 | 3 | 4;
    showCount: boolean;
    style?: StyleBreakpoints;
  };
}

export interface GeoListingsBlock extends BlockBase {
  type: "geoListings";
  props: {
    heading?: string;
    limit: number;
    columnsDesktop: 1 | 2 | 3;
    showImage: boolean;
    showDescription: boolean;
    style?: StyleBreakpoints;
  };
}

export interface GeoFaqBlock extends BlockBase {
  type: "geoFaq";
  props: {
    heading?: string;
    style?: StyleBreakpoints;
  };
}

export type GeoSidebarWidget =
  | { type: "states"; heading?: string; limit?: number }
  | { type: "listings"; heading?: string; limit?: number }
  | { type: "faq"; heading?: string; limit?: number }
  | { type: "custom"; heading?: string; content?: string };

export interface GeoSidebarBlock extends BlockBase {
  type: "geoSidebar";
  props: {
    widgets: GeoSidebarWidget[];
    width?: number;
    style?: StyleBreakpoints;
  };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Geo Category Template Block Union                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export type GeoCategoryTemplateBlock =
  | GeoHeroBlock
  | GeoContentBlock
  | GeoRegionNavBlock
  | GeoListingsBlock
  | GeoFaqBlock
  | GeoSidebarBlock
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

export type GeoCategoryTemplateBlockType = GeoCategoryTemplateBlock["type"];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  All Allowed Block Types (Geo Category Template Builder)                    */
/* ──────────────────────────────────────────────────────────────────────────── */

export const GEO_TEMPLATE_LEAF_BLOCK_TYPES: GeoCategoryTemplateBlockType[] = [
  // Geo-specific
  "geoHero",
  "geoContent",
  "geoRegionNav",
  "geoListings",
  "geoFaq",
  "geoSidebar",
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

export const GEO_TEMPLATE_CONTAINER_BLOCK_TYPES: GeoCategoryTemplateBlockType[] = [
  "row",
  "section",
];

export const ALL_GEO_TEMPLATE_BLOCK_TYPES: GeoCategoryTemplateBlockType[] = [
  ...GEO_TEMPLATE_CONTAINER_BLOCK_TYPES,
  ...GEO_TEMPLATE_LEAF_BLOCK_TYPES,
];

export const GEO_TEMPLATE_ROW_LAYOUTS: RowLayout[] = ROW_LAYOUTS;

/** Default variation tags stored on GeoCategoryTemplate.layout. */
export type GeoTemplateLayout = "FULLWIDTH" | "SIDEBAR";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Factory Functions                                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export function createGeoCategoryTemplateBlock(
  type: GeoCategoryTemplateBlockType,
): GeoCategoryTemplateBlock {
  switch (type) {
    case "geoHero":
      return {
        id: crypto.randomUUID(),
        type: "geoHero",
        props: {
          layout: "standard",
          showImage: true,
          showBreadcrumb: true,
          showDescription: true,
        },
      } as GeoHeroBlock;

    case "geoContent":
      return {
        id: crypto.randomUUID(),
        type: "geoContent",
        props: {
          showHeading: false,
          heading: "Overview",
          content: "",
          maxWidth: 760,
        },
      } as GeoContentBlock;

    case "geoRegionNav":
      return {
        id: crypto.randomUUID(),
        type: "geoRegionNav",
        props: {
          heading: "Programs by state",
          columns: 3,
          showCount: false,
        },
      } as GeoRegionNavBlock;

    case "geoListings":
      return {
        id: crypto.randomUUID(),
        type: "geoListings",
        props: {
          heading: "Featured programs",
          limit: 9,
          columnsDesktop: 3,
          showImage: true,
          showDescription: true,
        },
      } as GeoListingsBlock;

    case "geoFaq":
      return {
        id: crypto.randomUUID(),
        type: "geoFaq",
        props: {
          heading: "Frequently asked questions",
        },
      } as GeoFaqBlock;

    case "geoSidebar":
      return {
        id: crypto.randomUUID(),
        type: "geoSidebar",
        props: {
          widgets: [
            { type: "states", heading: "Programs by state", limit: 12 },
            { type: "listings", heading: "Featured programs", limit: 5 },
            { type: "custom", heading: "About this directory", content: "<p>Hand-reviewed programs, updated regularly.</p>" },
          ],
          width: 320,
        },
      } as GeoSidebarBlock;

    default:
      return createBlock(type) as GeoCategoryTemplateBlock;
  }
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Default Template Variations (Fullwidth + Right Sidebar)                    */
/* ──────────────────────────────────────────────────────────────────────────── */

const FULLWIDTH_ROW_ID = "geo-default-fullwidth-row";
const FULLWIDTH_COL_ID = "geo-default-fullwidth-col";

export const DEFAULT_GEO_FULLWIDTH_BLOCKS: GeoCategoryTemplateBlock[] = [
  {
    id: "geo-default-fullwidth-section",
    type: "section",
    props: {
      rows: [
        {
          id: FULLWIDTH_ROW_ID,
          type: "row",
          props: {
            columns: [
              {
                id: FULLWIDTH_COL_ID,
                span: 12,
                blocks: [
                  {
                    id: "geo-default-fullwidth-hero",
                    type: "geoHero",
                    props: {
                      layout: "standard",
                      showImage: true,
                      showBreadcrumb: true,
                      showDescription: true,
                    },
                  },
                  {
                    id: "geo-default-fullwidth-content",
                    type: "geoContent",
                    props: { showHeading: false, heading: "Overview", content: "", maxWidth: 760 },
                  },
                  {
                    id: "geo-default-fullwidth-nav",
                    type: "geoRegionNav",
                    props: { heading: "Programs by state", columns: 3, showCount: false },
                  },
                  {
                    id: "geo-default-fullwidth-faq",
                    type: "geoFaq",
                    props: { heading: "Frequently asked questions" },
                  },
                  {
                    id: "geo-default-fullwidth-listings",
                    type: "geoListings",
                    props: {
                      heading: "Featured programs",
                      limit: 9,
                      columnsDesktop: 3,
                      showImage: true,
                      showDescription: true,
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
      width: "boxed",
      maxWidth: 1200,
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 10,
      paddingBottom: 10,
    },
  } as unknown as SectionBlock,
];

const SIDEBAR_MAIN_COL_ID = "geo-default-sidebar-col-main";
const SIDEBAR_SIDE_COL_ID = "geo-default-sidebar-col-side";

export const DEFAULT_GEO_SIDEBAR_BLOCKS: GeoCategoryTemplateBlock[] = [
  {
    id: "geo-default-sidebar-section",
    type: "section",
    props: {
      rows: [
        {
          id: "geo-default-sidebar-row",
          type: "row",
          props: {
            columns: [
              {
                id: SIDEBAR_MAIN_COL_ID,
                span: 8,
                blocks: [
                  {
                    id: "geo-default-sidebar-hero",
                    type: "geoHero",
                    props: {
                      layout: "standard",
                      showImage: true,
                      showBreadcrumb: true,
                      showDescription: true,
                    },
                  },
                  {
                    id: "geo-default-sidebar-content",
                    type: "geoContent",
                    props: { showHeading: false, heading: "Overview", content: "", maxWidth: 760 },
                  },
                  {
                    id: "geo-default-sidebar-faq",
                    type: "geoFaq",
                    props: { heading: "Frequently asked questions" },
                  },
                  {
                    id: "geo-default-sidebar-listings",
                    type: "geoListings",
                    props: {
                      heading: "Featured programs",
                      limit: 6,
                      columnsDesktop: 2,
                      showImage: true,
                      showDescription: true,
                    },
                  },
                ],
              },
              {
                id: SIDEBAR_SIDE_COL_ID,
                span: 4,
                blocks: [
                  {
                    id: "geo-default-sidebar-sidebar",
                    type: "geoSidebar",
                    props: {
                      widgets: [
                        { type: "states", heading: "Programs by state", limit: 12 },
                        { type: "listings", heading: "Featured programs", limit: 5 },
                        { type: "custom", heading: "About this directory", content: "<p>Hand-reviewed programs, updated regularly.</p>" },
                      ],
                      width: 320,
                    },
                  },
                ],
              },
            ],
            gap: 32,
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
  } as unknown as SectionBlock,
];

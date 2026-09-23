/**
 * Header / Footer Builder — Block Types
 *
 * Extends the page builder block system with specialized blocks
 * for headers and footers (Logo, Menu, Social Icons, Contact Info, Search).
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
/*  Container Settings (wraps entire header/footer)                           */
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
  height?: "default" | "fitToScreen" | "minHeight";
  overflow?: "default" | "hidden" | "visible" | "scroll" | "auto";
  verticalAlign?: "default" | "top" | "middle" | "bottom" | "spaceBetween" | "spaceAround";
  htmlTag?: "default" | "div" | "section" | "article" | "aside" | "main" | "header" | "footer" | "nav";

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
  boxShadow?: string;
  textColor?: string;
  linkColor?: string;
  linkHoverColor?: string;
  // Background Type
  bgType?: "classic" | "gradient" | "video" | "slideshow";
  bgGradientStart?: string;
  bgGradientEnd?: string;
  bgGradientAngle?: number;
  bgGradientType?: "linear" | "radial";
  // Background Overlay
  overlayBgType?: "classic" | "gradient";
  overlayColor2?: string;
  overlayGradientStart?: string;
  overlayGradientEnd?: string;
  overlayGradientAngle?: number;
  // Shape Divider
  shapeDividerTop?: string;
  shapeDividerTopColor?: string;
  shapeDividerTopWidth?: number;
  shapeDividerTopHeight?: number;
  shapeDividerBottom?: string;
  shapeDividerBottomColor?: string;
  shapeDividerBottomWidth?: number;
  shapeDividerBottomHeight?: number;
  // Typography
  headingColor?: string;
  textAlign?: "left" | "center" | "right" | "justify";

  // Advanced
  margin: SpacingValues;
  padding: SpacingValues;
  zindex: number;
  cssId: string;
  cssClasses: string;
  customCss?: string;
  customAttributes?: string;
  // Motion Effects
  scrollingEffects?: boolean;
  sticky?: "none" | "top" | "bottom";
  entranceAnimation?: string;
  // Responsive
  reverseColumnsTablet?: boolean;
  reverseColumnsMobile?: boolean;
  hideOnDesktop?: boolean;
  hideOnTablet?: boolean;
  hideOnMobile?: boolean;
  // Display Conditions
  displayCondition?: string;
  displayConditionDate?: string;
  displayConditionUrl?: string;
}

export const DEFAULT_CONTAINER_SETTINGS: ContainerSettings = {
  width: "boxed",
  maxWidth: 1200,
  minHeight: 0,
  direction: "row",
  justifyContent: "flex-start",
  alignItems: "stretch",
  gapCol: 20,
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
  boxShadow: undefined,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  zindex: 0,
  cssId: "",
  cssClasses: "",
};

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Extended Layout/Style/Advanced Settings (for Section, Row, Column)         */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface StyleSettings {
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
  boxShadow?: string;
}

export interface AdvancedSettings {
  margin: SpacingValues;
  padding: SpacingValues;
  zindex: number;
  cssId: string;
  cssClasses: string;
}

export interface SectionLayoutSettings {
  width: "full" | "boxed";
  maxWidth: number;
  minHeight: number;
  direction: "row" | "column";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems: "stretch" | "flex-start" | "center" | "flex-end";
  gapCol: number;
  gapRow: number;
  wrap: "nowrap" | "wrap";
  height?: "default" | "fitToScreen" | "minHeight";
  overflow?: "default" | "hidden" | "visible" | "scroll" | "auto";
  verticalAlign?: "default" | "top" | "middle" | "bottom" | "spaceBetween" | "spaceAround";
  stretchSection?: boolean;
  htmlTag?: "default" | "div" | "section" | "article" | "aside" | "main" | "header" | "footer" | "nav";
}

export interface RowLayoutSettings {
  direction: "row" | "column";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  alignItems: "stretch" | "flex-start" | "center" | "flex-end";
  gapCol: number;
  gapRow: number;
  wrap: "nowrap" | "wrap";
  stackOnMobile: boolean;
  fullWidth: boolean;
  height?: "default" | "fitToScreen" | "minHeight";
  overflow?: "default" | "hidden" | "visible" | "scroll" | "auto";
  verticalAlign?: "default" | "top" | "middle" | "bottom" | "spaceBetween" | "spaceAround";
  htmlTag?: "default" | "div" | "section" | "article" | "aside" | "main" | "header" | "footer" | "nav";
}

export interface ColumnLayoutSettings {
  width: number;
  verticalAlign: "stretch" | "flex-start" | "center" | "flex-end";
  direction: "row" | "column";
  justifyContent: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
  gapCol: number;
  gapRow: number;
  wrap: "nowrap" | "wrap";
}

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
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
  boxShadow: undefined,
};

export const DEFAULT_ADVANCED_SETTINGS: AdvancedSettings = {
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  zindex: 0,
  cssId: "",
  cssClasses: "",
};

export const DEFAULT_SECTION_LAYOUT: SectionLayoutSettings = {
  width: "full",
  maxWidth: 1200,
  minHeight: 0,
  direction: "column",
  justifyContent: "flex-start",
  alignItems: "stretch",
  gapCol: 0,
  gapRow: 0,
  wrap: "nowrap",
};

export const DEFAULT_ROW_LAYOUT: RowLayoutSettings = {
  direction: "row",
  justifyContent: "flex-start",
  alignItems: "stretch",
  gapCol: 24,
  gapRow: 0,
  wrap: "nowrap",
  stackOnMobile: true,
  fullWidth: false,
};

export const DEFAULT_COLUMN_LAYOUT: ColumnLayoutSettings = {
  width: 12,
  verticalAlign: "stretch",
  direction: "column",
  justifyContent: "flex-start",
  gapCol: 0,
  gapRow: 0,
  wrap: "nowrap",
};

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Specialized Header / Footer Block Interfaces                              */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface LogoBlock extends BlockBase {
  type: "logo";
  props: {
    src: string;
    alt: string;
    linkTo: string;
    width: number;
    height: number;
  };
}

export interface MenuBlock extends BlockBase {
  type: "menu";
  props: {
    menuId: string;
    orientation: "horizontal" | "vertical";
    style: "links" | "dropdown" | "hamburger";
    align: "left" | "center" | "right" | "between";
    gap: number;
    textColor?: string;
    hoverColor?: string;
    fontSize?: number;
    mobileMenuStyle: "slide" | "overlay" | "dropdown";
    // Elementor-style props
    pointer?: "none" | "underline" | "framed" | "background" | "double";
    pointerWidth?: number;
    pointerColor?: string;
    animation?: "none" | "fade" | "slide" | "grow";
    hPadding?: number;
    vPadding?: number;
    spaceBetween?: number;
    menuName?: string;
    mobileBreakpoint?: number;
    fullMobileWidth?: boolean;
    mobileTextAlign?: "left" | "center" | "right";
    toggleButton?: "hamburger" | "classic" | "bubble";
    toggleAlign?: "left" | "center" | "right";
    toggleColor?: string;
    toggleSize?: number;
    dropdownBgColor?: string;
    dropdownTextColor?: string;
    dropdownHoverColor?: string;
    activeColor?: string;
    fontFamily?: string;
    fontWeight?: string;
    textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
    letterSpacing?: number;
  };
}

export interface SocialIconsBlock extends BlockBase {
  type: "socialIcons";
  props: {
    icons: Array<{
      platform: string;
      url: string;
      label: string;
    }>;
    style: "filled" | "outlined" | "minimal";
    size: "sm" | "md" | "lg";
    color: string;
    hoverColor: string;
    gap: number;
  };
}

export interface ContactInfoBlock extends BlockBase {
  type: "contactInfo";
  props: {
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
    showHours: boolean;
    phone: string;
    email: string;
    address: string;
    hours: string;
    separator: "dot" | "pipe" | "space" | "newline";
    iconStyle: "none" | "emoji" | "svg";
    textColor?: string;
    fontSize?: number;
  };
}

export interface SearchBlock extends BlockBase {
  type: "search";
  props: {
    placeholder: string;
    style: "minimal" | "expanded" | "icon-only";
    width: number;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    borderRadius: number;
  };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Header / Footer Block Union                                               */
/* ──────────────────────────────────────────────────────────────────────────── */

export type HeaderFooterBlock =
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
  | SectionBlock
  | LogoBlock
  | MenuBlock
  | SocialIconsBlock
  | ContactInfoBlock
  | SearchBlock;

export type HeaderFooterBlockType = HeaderFooterBlock["type"];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Helper Functions                                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export function isHeaderFooterBlock(block: { type: string }): block is HeaderFooterBlock {
  return HEADER_FOOTER_LEAF_BLOCK_TYPES.includes(block.type as HeaderFooterBlockType);
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Block Definitions (Header/Footer Specialized Blocks)                      */
/* ──────────────────────────────────────────────────────────────────────────── */

export const HEADER_FOOTER_SPECIALIZED_DEFINITIONS: Array<
  BlockDefinition & { category: string }
> = [
  {
    type: "logo",
    label: "Logo",
    icon: "◎",
    category: "Header / Footer",
    defaults: {
      src: "",
      alt: "Logo",
      linkTo: "/",
      width: 150,
      height: 50,
    },
  },
  {
    type: "menu",
    label: "Navigation Menu",
    icon: "☰",
    category: "Header / Footer",
    defaults: {
      menuId: "",
      orientation: "horizontal",
      style: "links",
      align: "right",
      gap: 24,
      mobileMenuStyle: "hamburger",
    },
  },
  {
    type: "socialIcons",
    label: "Social Icons",
    icon: "⏹",
    category: "Header / Footer",
    defaults: {
      icons: [],
      style: "filled",
      size: "md",
      color: "#6b7280",
      hoverColor: "#111827",
      gap: 16,
    },
  },
  {
    type: "contactInfo",
    label: "Contact Info",
    icon: "📞",
    category: "Header / Footer",
    defaults: {
      showPhone: true,
      showEmail: true,
      showAddress: false,
      showHours: false,
      phone: "",
      email: "",
      address: "",
      hours: "",
      separator: "dot",
      iconStyle: "emoji",
    },
  },
  {
    type: "search",
    label: "Search Bar",
    icon: "🔍",
    category: "Header / Footer",
    defaults: {
      placeholder: "Search...",
      style: "icon-only",
      width: 300,
      borderRadius: 8,
    },
  },
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  All Allowed Block Types (Header/Footer Builder)                           */
/* ──────────────────────────────────────────────────────────────────────────── */

export const HEADER_FOOTER_LEAF_BLOCK_TYPES: HeaderFooterBlockType[] = [
  "logo",
  "menu",
  "socialIcons",
  "contactInfo",
  "search",
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

export const HEADER_FOOTER_CONTAINER_BLOCK_TYPES: HeaderFooterBlockType[] = [
  "row",
  "section",
];

export const ALL_HEADER_FOOTER_BLOCK_TYPES: HeaderFooterBlockType[] = [
  ...HEADER_FOOTER_CONTAINER_BLOCK_TYPES,
  ...HEADER_FOOTER_LEAF_BLOCK_TYPES,
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Row Layouts (reusable from page builder)                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export const HEADER_FOOTER_ROW_LAYOUTS: RowLayout[] = pickRowLayouts([
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

export function createHeaderFooterBlock(type: HeaderFooterBlockType): HeaderFooterBlock {
  const specialized = HEADER_FOOTER_SPECIALIZED_DEFINITIONS.find((d) => d.type === type);
  if (specialized) {
    return {
      id: crypto.randomUUID(),
      type: type as HeaderFooterBlockType,
      props: structuredClone(specialized.defaults),
    } as HeaderFooterBlock;
  }

  // Delegate to page builder's createBlock for standard types
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createBlock } = require("../page-builder/types") as typeof import("../page-builder/types");
  return createBlock(type) as HeaderFooterBlock;
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Default Blocks (Fallback when no template is assigned)                    */
/* ──────────────────────────────────────────────────────────────────────────── */

export const DEFAULT_HEADER_BLOCKS: HeaderFooterBlock[] = [
  {
    id: "default-header-row",
    type: "row",
    props: {
      columns: [
        {
          id: "default-logo-col",
          span: 3,
          blocks: [
            {
              id: "default-logo",
              type: "logo",
              props: { src: "", alt: "Logo", linkTo: "/", width: 150, height: 50 },
            },
          ],
        },
        {
          id: "default-menu-col",
          span: 9,
          blocks: [
            {
              id: "default-menu",
              type: "menu",
              props: {
                menuId: "",
                orientation: "horizontal",
                style: "links",
                align: "right",
                gap: 24,
                mobileMenuStyle: "slide",
                pointer: "underline",
                pointerWidth: 2,
                animation: "fade",
                hPadding: 12,
                vPadding: 8,
                spaceBetween: 24,
                mobileBreakpoint: 1024,
                fullMobileWidth: true,
                mobileTextAlign: "left",
                toggleButton: "hamburger",
                toggleAlign: "right",
                toggleSize: 24,
                dropdownBgColor: "#ffffff",
                dropdownTextColor: "#333333",
                activeColor: "#D4A853",
              },
            },
          ],
        },
      ],
      gap: 24,
      align: "center",
      stackOnMobile: true,
      paddingY: 16,
      width: "full",
      fullWidth: true,
    },
  },
];

export const DEFAULT_FOOTER_BLOCKS: HeaderFooterBlock[] = [
  {
    id: "default-footer-row",
    type: "row",
    props: {
      columns: [
        {
          id: "footer-col-1",
          span: 3,
          blocks: [
            {
              id: "footer-logo",
              type: "logo",
              props: { src: "", alt: "Logo", linkTo: "/", width: 120, height: 40 },
            },
            {
              id: "footer-social",
              type: "socialIcons",
              props: {
                icons: [],
                style: "filled",
                size: "md",
                color: "#9ca3af",
                hoverColor: "#ffffff",
                gap: 16,
              },
            },
          ],
        },
        {
          id: "footer-col-2",
          span: 3,
          blocks: [
            {
              id: "footer-nav-heading",
              type: "heading",
              props: { text: "Navigate", level: 4, align: "left" },
            },
            {
              id: "footer-nav",
              type: "menu",
              props: {
                menuId: "",
                orientation: "vertical",
                style: "links",
                align: "left",
                gap: 8,
                mobileMenuStyle: "dropdown",
              },
            },
          ],
        },
        {
          id: "footer-col-3",
          span: 3,
          blocks: [
            {
              id: "footer-contact-heading",
              type: "heading",
              props: { text: "Contact", level: 4, align: "left" },
            },
            {
              id: "footer-contact",
              type: "contactInfo",
              props: {
                showPhone: true,
                showEmail: true,
                showAddress: true,
                showHours: false,
                phone: "",
                email: "",
                address: "",
                hours: "",
                separator: "newline",
                iconStyle: "none",
              },
            },
          ],
        },
        {
          id: "footer-col-4",
          span: 3,
          blocks: [
            {
              id: "footer-search-heading",
              type: "heading",
              props: { text: "Search", level: 4, align: "left" },
            },
            {
              id: "footer-search",
              type: "search",
              props: {
                placeholder: "Search...",
                style: "minimal",
                width: 250,
                borderRadius: 4,
              },
            },
          ],
        },
      ],
      gap: 24,
      align: "start",
      stackOnMobile: true,
      paddingY: 48,
      width: "full",
      fullWidth: true,
      bgColor: "#111827",
      textColor: "#f9fafb",
    },
  },
];

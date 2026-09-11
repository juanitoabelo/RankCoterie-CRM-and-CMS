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
  ColumnData,
  RowLayout,
} from "../page-builder/types";

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

export const HEADER_FOOTER_ROW_LAYOUTS: RowLayout[] = [
  { id: "two-halves", label: "2 columns (6+6)", icon: "▥", spans: [6, 6] },
  { id: "logo-nav", label: "Logo + Nav (3+9)", icon: "▤", spans: [3, 9] },
  { id: "nav-logo", label: "Nav + Logo (9+3)", icon: "▧", spans: [9, 3] },
  { id: "three", label: "3 columns (4+4+4)", icon: "▦", spans: [4, 4, 4] },
  { id: "logo-center-nav", label: "Logo Center + Nav (2+8+2)", icon: "▥", spans: [2, 8, 2] },
  { id: "footer-four", label: "4 columns (3+3+3+3)", icon: "▦", spans: [3, 3, 3, 3] },
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Factory Functions                                                         */
/* ──────────────────────────────────────────────────────────────────────────── */

function freshColumn(span: number): ColumnData {
  return { id: crypto.randomUUID(), span, blocks: [] };
}

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
  const { createBlock } = require("../page-builder/types");
  return createBlock(type) as HeaderFooterBlock;
}

export function createHeaderFooterRowLayout(layoutId: string): RowBlock {
  const layout = HEADER_FOOTER_ROW_LAYOUTS.find((l) => l.id === layoutId);
  const spans = layout?.spans ?? [6, 6];
  return {
    id: crypto.randomUUID(),
    type: "row",
    props: {
      columns: spans.map(freshColumn),
      gap: 24,
      align: "center",
      stackOnMobile: true,
      paddingY: 16,
      fullWidth: false,
    },
  };
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
                mobileMenuStyle: "hamburger",
              },
            },
          ],
        },
      ],
      gap: 24,
      align: "center",
      stackOnMobile: true,
      paddingY: 16,
      fullWidth: false,
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
      fullWidth: true,
      bgColor: "#111827",
      textColor: "#f9fafb",
    },
  },
];

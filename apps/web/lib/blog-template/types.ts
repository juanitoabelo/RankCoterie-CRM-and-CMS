/**
 * Blog Template Builder — Block Types
 *
 * Extends the page builder block system for blog listing and single article
 * templates with specialized blocks for blog content.
 */

import type {
  BlockBase,
  Block,
  BlockType,
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
  VideoBlock,
  StyleBreakpoints,
  RowLayout,
} from "../page-builder/types";
import { pickRowLayouts } from "../page-builder/types";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Container Settings (wraps entire blog template)                             */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface SpacingValues {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

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
/*  Blog-Specific Block Types                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface BlogPostGridBlock extends BlockBase {
  type: "blogPostGrid";
  props: {
    heading?: string;
    layout: "grid" | "list" | "masonry";
    /** @deprecated Use columnsDesktop/tablet/mobile instead. Legacy fallback. */
    columns: 1 | 2 | 3;
    columnsDesktop: 1 | 2 | 3;
    columnsTablet?: 1 | 2 | 3;
    columnsMobile?: 1 | 2 | 3;
    postsPerPage: number;
    showExcerpt: boolean;
    excerptLength: number;
    showFeaturedImage: boolean;
    showAuthor: boolean;
    showDate: boolean;
    showCategory: boolean;
    showPagination: boolean;
    orderBy: "date" | "title" | "popular";
    // Style
    cardStyle?: "bordered" | "shadow" | "minimal";
    imageAspect?: "16:9" | "4:3" | "1:1";
    style?: StyleBreakpoints;
  };
}

export interface BlogSidebarBlock extends BlockBase {
  type: "blogSidebar";
  props: {
    widgets: Array<
      | { type: "categories"; heading?: string; limit?: number }
      | { type: "recentPosts"; heading?: string; limit?: number }
      | { type: "search"; heading?: string }
      | { type: "tags"; heading?: string }
      | { type: "custom"; heading?: string; content?: string }
    >;
    width?: number;
    position: "left" | "right";
    style?: StyleBreakpoints;
  };
}

export interface ArticleContentBlock extends BlockBase {
  type: "articleContent";
  props: {
    showTitle: boolean;
    showMeta: boolean;
    showAuthor: boolean;
    showDate: boolean;
    showCategory: boolean;
    showFeaturedImage: boolean;
    showSocialShare: boolean;
    showNavigation: boolean;
    maxWidth?: number;
    style?: StyleBreakpoints;
  };
}

export interface ArticleHeroBlock extends BlockBase {
  type: "articleHero";
  props: {
    layout: "standard" | "full-width" | "centered";
    showBreadcrumb: boolean;
    showCategory: boolean;
    showAuthor: boolean;
    showDate: boolean;
    bgColor?: string;
    textColor?: string;
    style?: StyleBreakpoints;
  };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Blog Template Block Union                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

export type BlogTemplateBlock =
  | BlogPostGridBlock
  | BlogSidebarBlock
  | ArticleContentBlock
  | ArticleHeroBlock
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
  | VideoBlock
  | RowBlock
  | SectionBlock;

export type BlogTemplateBlockType = BlogTemplateBlock["type"];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  All Allowed Block Types (Blog Template Builder)                             */
/* ──────────────────────────────────────────────────────────────────────────── */

export const BLOG_TEMPLATE_LEAF_BLOCK_TYPES: BlogTemplateBlockType[] = [
  // Blog-specific
  "blogPostGrid",
  "blogSidebar",
  "articleContent",
  "articleHero",
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
  "video",
];

export const BLOG_TEMPLATE_CONTAINER_BLOCK_TYPES: BlogTemplateBlockType[] = [
  "row",
  "section",
];

export const ALL_BLOG_TEMPLATE_BLOCK_TYPES: BlogTemplateBlockType[] = [
  ...BLOG_TEMPLATE_CONTAINER_BLOCK_TYPES,
  ...BLOG_TEMPLATE_LEAF_BLOCK_TYPES,
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Row Layouts (blog-specific presets)                                         */
/* ──────────────────────────────────────────────────────────────────────────── */

export const BLOG_TEMPLATE_ROW_LAYOUTS: RowLayout[] = pickRowLayouts([
  "two-halves",
  "content-sidebar",
  "sidebar-content",
  "three",
  "footer-four",
]);

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Factory Functions                                                          */
/* ──────────────────────────────────────────────────────────────────────────── */

export function createBlogTemplateBlock(type: BlogTemplateBlockType): BlogTemplateBlock {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createBlock } = require("../page-builder/types") as typeof import("../page-builder/types");

  // Blog-specific blocks
  switch (type) {
    case "blogPostGrid":
      return {
        id: crypto.randomUUID(),
        type: "blogPostGrid",
        props: {
          heading: "Latest Posts",
          layout: "grid",
          columns: 3,
          columnsDesktop: 3,
          columnsTablet: 2,
          columnsMobile: 1,
          postsPerPage: 9,
          showExcerpt: true,
          excerptLength: 150,
          showFeaturedImage: true,
          showAuthor: true,
          showDate: true,
          showCategory: true,
          showPagination: true,
          orderBy: "date",
          cardStyle: "shadow",
          imageAspect: "16:9",
        },
      } as BlogPostGridBlock;

    case "blogSidebar":
      return {
        id: crypto.randomUUID(),
        type: "blogSidebar",
        props: {
          widgets: [
            { type: "search", heading: "Search" },
            { type: "categories", heading: "Categories", limit: 10 },
            { type: "recentPosts", heading: "Recent Posts", limit: 5 },
          ],
          width: 300,
          position: "right",
        },
      } as BlogSidebarBlock;

    case "articleContent":
      return {
        id: crypto.randomUUID(),
        type: "articleContent",
        props: {
          showTitle: true,
          showMeta: true,
          showAuthor: true,
          showDate: true,
          showCategory: true,
          showFeaturedImage: true,
          showSocialShare: true,
          showNavigation: true,
          maxWidth: 720,
        },
      } as ArticleContentBlock;

    case "articleHero":
      return {
        id: crypto.randomUUID(),
        type: "articleHero",
        props: {
          layout: "standard",
          showBreadcrumb: true,
          showCategory: true,
          showAuthor: true,
          showDate: true,
        },
      } as ArticleHeroBlock;

    default:
      return createBlock(type) as BlogTemplateBlock;
  }
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Default Blocks (Fallback when no template is assigned)                     */
/* ──────────────────────────────────────────────────────────────────────────── */

export const DEFAULT_BLOG_LISTING_BLOCKS: BlogTemplateBlock[] = [
  {
    id: "default-blog-section",
    type: "section",
    props: {
      rows: [
        {
          id: "default-blog-row",
          type: "row",
          props: {
            columns: [
              {
                id: "default-blog-col-main",
                span: 8,
                blocks: [
                  {
                    id: "default-blog-grid",
                    type: "blogPostGrid",
                    props: {
                      heading: "Blog",
                      layout: "grid",
                      columns: 2,
                      columnsDesktop: 2,
                      columnsTablet: 2,
                      columnsMobile: 1,
                      postsPerPage: 9,
                      showExcerpt: true,
                      excerptLength: 150,
                      showFeaturedImage: true,
                      showAuthor: true,
                      showDate: true,
                      showCategory: true,
                      showPagination: true,
                      orderBy: "date",
                      cardStyle: "shadow",
                      imageAspect: "16:9",
                    },
                  },
                ],
              },
              {
                id: "default-blog-col-sidebar",
                span: 4,
                blocks: [
                  {
                    id: "default-blog-sidebar",
                    type: "blogSidebar",
                    props: {
                      widgets: [
                        { type: "search", heading: "Search" },
                        { type: "categories", heading: "Categories", limit: 10 },
                        { type: "recentPosts", heading: "Recent Posts", limit: 5 },
                      ],
                      width: 300,
                      position: "right",
                    },
                  },
                ],
              },
            ],
            gap: 24,
            align: "stretch",
            stackOnMobile: true,
            paddingY: 48,
            width: "full",
            fullWidth: true,
          },
        },
      ],
      width: "full",
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 48,
      paddingBottom: 48,
    },
  } as SectionBlock,
];

export const DEFAULT_BLOG_SINGLE_BLOCKS: BlogTemplateBlock[] = [
  {
    id: "default-single-section",
    type: "section",
    props: {
      rows: [
        {
          id: "default-single-row",
          type: "row",
          props: {
            columns: [
              {
                id: "default-single-col-main",
                span: 8,
                blocks: [
                  {
                    id: "default-article-hero",
                    type: "articleHero",
                    props: {
                      layout: "standard",
                      showBreadcrumb: true,
                      showCategory: true,
                      showAuthor: true,
                      showDate: true,
                    },
                  },
                  {
                    id: "default-article-content",
                    type: "articleContent",
                    props: {
                      showTitle: true,
                      showMeta: true,
                      showAuthor: true,
                      showDate: true,
                      showCategory: true,
                      showFeaturedImage: true,
                      showSocialShare: true,
                      showNavigation: true,
                      maxWidth: 720,
                    },
                  },
                ],
              },
              {
                id: "default-single-col-sidebar",
                span: 4,
                blocks: [
                  {
                    id: "default-single-sidebar",
                    type: "blogSidebar",
                    props: {
                      widgets: [
                        { type: "search", heading: "Search" },
                        { type: "categories", heading: "Categories", limit: 10 },
                        { type: "recentPosts", heading: "Recent Posts", limit: 5 },
                      ],
                      width: 300,
                      position: "right",
                    },
                  },
                ],
              },
            ],
            gap: 24,
            align: "stretch",
            stackOnMobile: true,
            paddingY: 48,
            width: "full",
            fullWidth: true,
          },
        },
      ],
      width: "full",
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 48,
      paddingBottom: 48,
    },
  } as SectionBlock,
];

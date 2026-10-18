/**
 * Listing Template Builder — tree block types (Visual/Structure model).
 *
 * Mirrors lib/blog-template/types.ts: templates are stored as the shared
 * page-builder block tree (section → row → column → blocks) plus container
 * settings, with listing-specific leaf blocks for every piece of a
 * single-listing page. Legacy flat templates (ListingBlock[] + SidebarWidget[])
 * still render via ListingTemplateRenderer; this file defines the tree model
 * the builder edits and the public tree renderer draws.
 */

import type {
  BlockBase,
  Block,
  RowBlock,
  SectionBlock,
  ColumnData,
  TextBlock,
  HeadingBlock,
  ImageBlock,
  ButtonBlock,
  DividerBlock,
  SpacerBlock,
  StyleBreakpoints,
  RowLayout,
} from "@/lib/page-builder/types";
import { createBlock } from "@/lib/page-builder/types";
import type { HeroVariant, ListingBlock, SidebarWidget, TemplateLayout } from "./types";
import type { ListingBlockBindings } from "./bindings";

export type { ContainerSettings } from "@/lib/blog-template/types";
export { DEFAULT_CONTAINER_SETTINGS } from "@/lib/blog-template/types";
import type { ContainerSettings } from "@/lib/blog-template/types";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/blog-template/types";

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Listing-Specific Leaf Blocks                                               */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface ListingHeroBlock extends BlockBase {
  type: "listingHero";
  props: {
    variant: HeroVariant;
    showBreadcrumb: boolean;
    showCover: boolean;
    showAvatar: boolean;
    showBadges: boolean;
    showContact: boolean;
    showAddress: boolean;
    showSummary: boolean;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingAboutBlock extends BlockBase {
  type: "listingAbout";
  props: {
    heading: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingDescriptionBlock extends BlockBase {
  type: "listingDescription";
  props: {
    heading: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingDetailsBlock extends BlockBase {
  type: "listingDetails";
  props: {
    heading: string;
    items: Array<"categories" | "areas" | "specialties" | "amenities" | "certifications" | "insurance" | "hours">;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingGalleryBlock extends BlockBase {
  type: "listingGallery";
  props: {
    limit: number;
    hideIfEmpty: boolean;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingMapBlock extends BlockBase {
  type: "listingMap";
  props: {
    hideIfEmpty: boolean;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingVideoBlock extends BlockBase {
  type: "listingVideo";
  props: {
    hideIfEmpty: boolean;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingReviewsBlock extends BlockBase {
  type: "listingReviews";
  props: {
    heading: string;
    limit: number;
    showResponse: boolean;
    showCount: boolean;
    hideIfEmpty: boolean;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingReviewFormBlock extends BlockBase {
  type: "listingReviewForm";
  props: {
    heading: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingContactFormBlock extends BlockBase {
  type: "listingContactForm";
  props: {
    title: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingQuickFactsBlock extends BlockBase {
  type: "listingQuickFacts";
  props: {
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingHoursBlock extends BlockBase {
  type: "listingHours";
  props: {
    title: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingAreasBlock extends BlockBase {
  type: "listingAreas";
  props: {
    title: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingCategoriesBlock extends BlockBase {
  type: "listingCategories";
  props: {
    title: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingSocialBlock extends BlockBase {
  type: "listingSocial";
  props: {
    title: string;
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

export interface ListingClaimBlock extends BlockBase {
  type: "listingClaim";
  props: {
    style?: StyleBreakpoints;
    bindings?: ListingBlockBindings;
  };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Block Union + Type Lists                                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export type ListingTemplateLeafBlock =
  | ListingHeroBlock
  | ListingAboutBlock
  | ListingDescriptionBlock
  | ListingDetailsBlock
  | ListingGalleryBlock
  | ListingMapBlock
  | ListingVideoBlock
  | ListingReviewsBlock
  | ListingReviewFormBlock
  | ListingContactFormBlock
  | ListingQuickFactsBlock
  | ListingHoursBlock
  | ListingAreasBlock
  | ListingCategoriesBlock
  | ListingSocialBlock
  | ListingClaimBlock
  | TextBlock
  | HeadingBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock;

export type ListingTemplateBlock = ListingTemplateLeafBlock | RowBlock | SectionBlock;

export type ListingTemplateBlockType = ListingTemplateBlock["type"];

export const LISTING_TEMPLATE_LEAF_BLOCK_TYPES: string[] = [
  "listingHero",
  "listingAbout",
  "listingDescription",
  "listingDetails",
  "listingGallery",
  "listingMap",
  "listingVideo",
  "listingReviews",
  "listingReviewForm",
  "listingContactForm",
  "listingQuickFacts",
  "listingHours",
  "listingAreas",
  "listingCategories",
  "listingSocial",
  "listingClaim",
  "text",
  "heading",
  "image",
  "button",
  "divider",
  "spacer",
];

export const LISTING_TEMPLATE_CONTAINER_BLOCK_TYPES: string[] = ["row", "section"];

export const LISTING_BLOCK_META: Array<{ type: string; label: string; description: string; icon: string }> = [
  { type: "listingHero", label: "Listing Hero", description: "Title, badges, cover, contact header", icon: "🎬" },
  { type: "listingAbout", label: "About", description: "Listing summary card", icon: "📝" },
  { type: "listingDescription", label: "Description", description: "Full description (HTML)", icon: "📄" },
  { type: "listingDetails", label: "Details Grid", description: "Categories, areas, specialties…", icon: "📊" },
  { type: "listingGallery", label: "Gallery", description: "Listing gallery images", icon: "🖼" },
  { type: "listingMap", label: "Map", description: "Google Maps embed", icon: "🗺" },
  { type: "listingVideo", label: "Video", description: "YouTube/Vimeo embed", icon: "▶" },
  { type: "listingReviews", label: "Reviews", description: "Latest approved reviews", icon: "💬" },
  { type: "listingReviewForm", label: "Review Form", description: "Write-a-review form", icon: "✍" },
  { type: "listingContactForm", label: "Contact Form", description: "Lead capture sidebar card", icon: "📨" },
  { type: "listingQuickFacts", label: "Quick Facts", description: "Tier, rating, verified", icon: "⚡" },
  { type: "listingHours", label: "Hours", description: "Compact hours list", icon: "🕒" },
  { type: "listingAreas", label: "Areas Served", description: "Region chips", icon: "📍" },
  { type: "listingCategories", label: "Categories", description: "Category chips", icon: "🏷" },
  { type: "listingSocial", label: "Social Links", description: "Social profile icons", icon: "🔗" },
  { type: "listingClaim", label: "Claim Card", description: "Own-this-business CTA", icon: "🚩" },
];

/** Listing-relevant row layouts (subset of ROW_LAYOUTS + full-width row). */
export const LISTING_ROW_LAYOUTS: RowLayout[] = [
  { id: "row", label: "Full width", icon: "▭", spans: [12] },
  { id: "content-sidebar", label: "Content + Sidebar (8+4)", icon: "▥", spans: [8, 4] },
  { id: "sidebar-content", label: "Sidebar + Content (4+8)", icon: "▥", spans: [4, 8] },
  { id: "two-halves", label: "2 columns (6+6)", icon: "▥", spans: [6, 6] },
  { id: "three", label: "3 columns (4+4+4)", icon: "▦", spans: [4, 4, 4] },
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Factory                                                                    */
/* ──────────────────────────────────────────────────────────────────────────── */

export function createListingTemplateBlock(type: string): ListingTemplateBlock {
  switch (type) {
    case "listingHero":
      return {
        id: crypto.randomUUID(),
        type: "listingHero",
        props: {
          variant: "default",
          showBreadcrumb: true,
          showCover: true,
          showAvatar: true,
          showBadges: true,
          showContact: true,
          showAddress: true,
          showSummary: false,
        },
      } as ListingHeroBlock;
    case "listingAbout":
      return { id: crypto.randomUUID(), type: "listingAbout", props: { heading: "About" } } as ListingAboutBlock;
    case "listingDescription":
      return { id: crypto.randomUUID(), type: "listingDescription", props: { heading: "Description" } } as ListingDescriptionBlock;
    case "listingDetails":
      return {
        id: crypto.randomUUID(),
        type: "listingDetails",
        props: {
          heading: "Details",
          items: ["categories", "areas", "specialties", "amenities", "certifications", "insurance", "hours"],
        },
      } as ListingDetailsBlock;
    case "listingGallery":
      return { id: crypto.randomUUID(), type: "listingGallery", props: { limit: 4, hideIfEmpty: true } } as ListingGalleryBlock;
    case "listingMap":
      return { id: crypto.randomUUID(), type: "listingMap", props: { hideIfEmpty: true } } as ListingMapBlock;
    case "listingVideo":
      return { id: crypto.randomUUID(), type: "listingVideo", props: { hideIfEmpty: true } } as ListingVideoBlock;
    case "listingReviews":
      return {
        id: crypto.randomUUID(),
        type: "listingReviews",
        props: { heading: "Reviews", limit: 3, showResponse: true, showCount: true, hideIfEmpty: true },
      } as ListingReviewsBlock;
    case "listingReviewForm":
      return { id: crypto.randomUUID(), type: "listingReviewForm", props: { heading: "Write a Review" } } as ListingReviewFormBlock;
    case "listingContactForm":
      return { id: crypto.randomUUID(), type: "listingContactForm", props: { title: "Contact This Business" } } as ListingContactFormBlock;
    case "listingQuickFacts":
      return { id: crypto.randomUUID(), type: "listingQuickFacts", props: {} } as ListingQuickFactsBlock;
    case "listingHours":
      return { id: crypto.randomUUID(), type: "listingHours", props: { title: "Hours" } } as ListingHoursBlock;
    case "listingAreas":
      return { id: crypto.randomUUID(), type: "listingAreas", props: { title: "Areas Served" } } as ListingAreasBlock;
    case "listingCategories":
      return { id: crypto.randomUUID(), type: "listingCategories", props: { title: "Categories" } } as ListingCategoriesBlock;
    case "listingSocial":
      return { id: crypto.randomUUID(), type: "listingSocial", props: { title: "Connect" } } as ListingSocialBlock;
    case "listingClaim":
      return { id: crypto.randomUUID(), type: "listingClaim", props: {} } as ListingClaimBlock;
    case "text":
    case "heading":
    case "image":
    case "button":
    case "divider":
    case "spacer":
      return createBlock(type) as ListingTemplateBlock;
    default:
      return createBlock(type as never) as ListingTemplateBlock;
  }
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Default Blocks (new / empty templates)                                      */
/* ──────────────────────────────────────────────────────────────────────────── */

export const DEFAULT_LISTING_TEMPLATE_BLOCKS: ListingTemplateBlock[] = [
  {
    id: "default-listing-hero",
    type: "listingHero",
    props: {
      variant: "default",
      showBreadcrumb: true,
      showCover: true,
      showAvatar: true,
      showBadges: true,
      showContact: true,
      showAddress: true,
      showSummary: false,
    },
  } as ListingHeroBlock,
  {
    id: "default-listing-section",
    type: "section",
    props: {
      rows: [
        {
          id: "default-listing-row",
          type: "row",
          props: {
            columns: [
              {
                id: "default-listing-col-main",
                span: 8,
                blocks: [
                  { id: "default-listing-about", type: "listingAbout", props: { heading: "About" } },
                  { id: "default-listing-description", type: "listingDescription", props: { heading: "Description" } },
                  { id: "default-listing-details", type: "listingDetails", props: { heading: "Details", items: ["categories", "areas", "specialties", "amenities", "certifications", "insurance", "hours"] } },
                  { id: "default-listing-gallery", type: "listingGallery", props: { limit: 4, hideIfEmpty: true } },
                  { id: "default-listing-reviews", type: "listingReviews", props: { heading: "Reviews", limit: 3, showResponse: true, showCount: true, hideIfEmpty: true } },
                  { id: "default-listing-review-form", type: "listingReviewForm", props: { heading: "Write a Review" } },
                ],
              },
              {
                id: "default-listing-col-side",
                span: 4,
                blocks: [
                  { id: "default-listing-contact", type: "listingContactForm", props: { title: "Contact This Business" } },
                  { id: "default-listing-facts", type: "listingQuickFacts", props: {} },
                  { id: "default-listing-hours", type: "listingHours", props: { title: "Hours" } },
                  { id: "default-listing-areas", type: "listingAreas", props: { title: "Areas Served" } },
                  { id: "default-listing-categories", type: "listingCategories", props: { title: "Categories" } },
                  { id: "default-listing-social", type: "listingSocial", props: { title: "Connect" } },
                  { id: "default-listing-claim", type: "listingClaim", props: {} },
                ],
              },
            ],
            gap: 24,
            align: "stretch",
            stackOnMobile: true,
            paddingY: 40,
            width: "full",
            fullWidth: true,
          },
        },
      ],
      width: "full",
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 40,
      paddingBottom: 40,
    },
  } as unknown as SectionBlock,
];

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Stored-Data Parsing (legacy flat vs tree)                                   */
/* ──────────────────────────────────────────────────────────────────────────── */

export interface ParsedListingTemplateData {
  model: "tree" | "legacy" | "empty";
  blocks: ListingTemplateBlock[];
  containerSettings: ContainerSettings;
  legacyBlocks: ListingBlock[];
  legacySidebar: SidebarWidget[];
}

/** Parse the `blocks` Json column: array → legacy flat model, object → tree. */
export function parseListingTemplateData(value: unknown): ParsedListingTemplateData {
  const empty: ParsedListingTemplateData = {
    model: "empty",
    blocks: [],
    containerSettings: DEFAULT_CONTAINER_SETTINGS,
    legacyBlocks: [],
    legacySidebar: [],
  };

  if (value == null) return empty;

  // Legacy flat model: the column holds the raw ListingBlock[] array.
  if (Array.isArray(value)) {
    return { ...empty, model: value.length > 0 ? "legacy" : "empty", legacyBlocks: value as ListingBlock[] };
  }

  if (typeof value === "string") {
    try {
      return parseListingTemplateData(JSON.parse(value));
    } catch {
      return empty;
    }
  }

  if (typeof value === "object") {
    // Tree model: the column holds { blocks: Block[], containerSettings }.
    // (The legacy model never stored an object wrapper — always a raw array —
    // so any object payload is tree data.)
    const obj = value as { blocks?: unknown; containerSettings?: Partial<ContainerSettings> };
    const treeBlocks = Array.isArray(obj.blocks) ? (obj.blocks as ListingTemplateBlock[]) : [];
    return {
      model: treeBlocks.length > 0 ? "tree" : "empty",
      blocks: treeBlocks,
      containerSettings: { ...DEFAULT_CONTAINER_SETTINGS, ...obj.containerSettings },
      legacyBlocks: [],
      legacySidebar: [],
    };
  }

  return empty;
}

/** Serialize a tree template for the `blocks` Json column. */
export function serializeListingTemplateTree(
  blocks: ListingTemplateBlock[],
  containerSettings: ContainerSettings,
): Record<string, unknown> {
  return { blocks, containerSettings };
}

/* ──────────────────────────────────────────────────────────────────────────── */
/*  Legacy → Tree Conversion                                                    */
/* ──────────────────────────────────────────────────────────────────────────── */

function legacyBlockToTree(block: ListingBlock): ListingTemplateBlock | null {
  switch (block.type) {
    case "heading":
      return { id: block.id, type: "heading", props: { text: block.heading ?? "", level: block.level ?? 2, align: block.align ?? "left" } } as HeadingBlock;
    case "text":
      return { id: block.id, type: "text", props: { content: block.text ?? "", align: block.align ?? "left" } } as TextBlock;
    case "image":
      return {
        id: block.id,
        type: "image",
        props: {
          src: block.src ?? (block.assetId ? (block.assetId.startsWith("http") ? block.assetId : `/api/assets/${block.assetId}/`) : ""),
          alt: "",
          caption: "",
          // Legacy listing-field fallback consumed by the tree renderer.
          field: block.field,
        },
      } as unknown as ImageBlock;
    case "gallery":
      return { id: block.id, type: "listingGallery", props: { limit: block.limit ?? 4, hideIfEmpty: block.hideIfEmpty !== false } } as ListingGalleryBlock;
    case "video":
      return { id: block.id, type: "listingVideo", props: { hideIfEmpty: block.hideIfEmpty !== false } } as ListingVideoBlock;
    case "map":
      return { id: block.id, type: "listingMap", props: { hideIfEmpty: block.hideIfEmpty !== false } } as ListingMapBlock;
    case "about":
      return { id: block.id, type: "listingAbout", props: { heading: block.heading ?? "About" } } as ListingAboutBlock;
    case "description":
      return { id: block.id, type: "listingDescription", props: { heading: block.heading ?? "Description" } } as ListingDescriptionBlock;
    case "details":
      return {
        id: block.id,
        type: "listingDetails",
        props: {
          heading: block.heading ?? "Details",
          items: block.items ?? ["categories", "areas", "specialties", "amenities", "certifications", "insurance", "hours"],
        },
      } as ListingDetailsBlock;
    case "reviews":
      return {
        id: block.id,
        type: "listingReviews",
        props: {
          heading: block.heading ?? "Reviews",
          limit: block.limit ?? 3,
          showResponse: block.showResponse !== false,
          showCount: block.showCount !== false,
          hideIfEmpty: block.hideIfEmpty !== false,
        },
      } as ListingReviewsBlock;
    case "reviewForm":
      return { id: block.id, type: "listingReviewForm", props: { heading: block.heading ?? "Write a Review" } } as ListingReviewFormBlock;
    case "divider":
      return { id: block.id, type: "divider", props: {} } as DividerBlock;
    case "spacer":
      return { id: block.id, type: "spacer", props: { height: block.height ?? 24 } } as SpacerBlock;
    case "button":
      return { id: block.id, type: "button", props: { text: block.text ?? "Visit", url: block.href ?? "", align: "left", variant: "primary" } } as unknown as ButtonBlock;
    case "html":
      return { id: block.id, type: "text", props: { content: block.html ?? "", align: "left" } } as TextBlock;
    default:
      return null;
  }
}

function legacyWidgetToTree(widget: SidebarWidget): ListingTemplateBlock | null {
  if (!widget.enabled) return null;
  switch (widget.type) {
    case "contactForm":
      return { id: widget.id, type: "listingContactForm", props: { title: widget.title || "Contact This Business" } } as ListingContactFormBlock;
    case "quickFacts":
      return { id: widget.id, type: "listingQuickFacts", props: {} } as ListingQuickFactsBlock;
    case "hours":
      return { id: widget.id, type: "listingHours", props: { title: widget.title || "Hours" } } as ListingHoursBlock;
    case "areas":
      return { id: widget.id, type: "listingAreas", props: { title: widget.title || "Areas Served" } } as ListingAreasBlock;
    case "categories":
      return { id: widget.id, type: "listingCategories", props: { title: widget.title || "Categories" } } as ListingCategoriesBlock;
    case "social":
      return { id: widget.id, type: "listingSocial", props: { title: widget.title || "Connect" } } as ListingSocialBlock;
    case "claim":
      return { id: widget.id, type: "listingClaim", props: {} } as ListingClaimBlock;
    case "map":
      return { id: widget.id, type: "listingMap", props: { hideIfEmpty: true } } as ListingMapBlock;
    case "gallery":
      return { id: widget.id, type: "listingGallery", props: { limit: widget.limit ?? 4, hideIfEmpty: true } } as ListingGalleryBlock;
    case "text":
      return { id: widget.id, type: "text", props: { content: widget.text ?? "", align: "left" } } as TextBlock;
    default:
      return null;
  }
}

/**
 * Convert a legacy flat template (blocks + sidebar arrays + layout/heroVariant
 * columns) into the tree model. Used when opening an old template in the new
 * builder; the next save persists the tree shape.
 */
export function legacyToTreeTemplate(
  blocks: ListingBlock[],
  sidebar: SidebarWidget[],
  layout: TemplateLayout | string | null | undefined,
  heroVariant: HeroVariant | string | null | undefined,
): { blocks: ListingTemplateBlock[]; containerSettings: ContainerSettings } {
  const tree: ListingTemplateBlock[] = [
    {
      id: "legacy-hero",
      type: "listingHero",
      props: {
        variant: (heroVariant as HeroVariant) || "default",
        showBreadcrumb: true,
        showCover: true,
        showAvatar: true,
        showBadges: true,
        showContact: true,
        showAddress: true,
        showSummary: false,
      },
    } as ListingHeroBlock,
  ];

  const mainBlocks = blocks.map(legacyBlockToTree).filter((b): b is ListingTemplateBlock => b !== null);
  const sideBlocks = sidebar.map(legacyWidgetToTree).filter((b): b is ListingTemplateBlock => b !== null);
  const hasSidebar = (layout ?? "sidebar") === "sidebar" && sideBlocks.length > 0;

  const columns: ColumnData[] = hasSidebar
    ? [
        { id: "legacy-main", span: 8, blocks: mainBlocks as unknown as Block[] },
        { id: "legacy-side", span: 4, blocks: sideBlocks as unknown as Block[] },
      ]
    : [{ id: "legacy-main", span: 12, blocks: mainBlocks as unknown as Block[] }];

  tree.push({
    id: "legacy-section",
    type: "section",
    props: {
      rows: [
        {
          id: "legacy-row",
          type: "row",
          props: {
            columns,
            gap: 24,
            align: "stretch",
            stackOnMobile: true,
            paddingY: 40,
            width: "full",
            fullWidth: true,
          },
        },
      ],
      width: "full",
      bgColor: undefined,
      bgImage: "",
      textColor: undefined,
      paddingTop: 40,
      paddingBottom: 40,
    },
  } as SectionBlock);

  return { blocks: tree, containerSettings: DEFAULT_CONTAINER_SETTINGS };
}

/** Cast helper: tree helpers operate on the shared page-builder Block union. */
export function asPageBuilderBlock(block: ListingTemplateBlock): Block {
  return block as unknown as Block;
}

export function asListingTemplateBlock(block: Block): ListingTemplateBlock {
  return block as unknown as ListingTemplateBlock;
}

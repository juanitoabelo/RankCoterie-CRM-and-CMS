/**
 * Listing Template Builder — block types for custom single-listing pages.
 *
 * A template = ordered main-content blocks + optional sidebar widgets.
 * Every content field supports data-binding tokens (see tokens.ts), e.g.
 * "{{title}} in {{city}}, {{state}}" resolves per listing at render time.
 */

export type ListingBlockType =
  | "heading"
  | "text"
  | "image"
  | "gallery"
  | "video"
  | "map"
  | "about"
  | "description"
  | "details"
  | "reviews"
  | "reviewForm"
  | "divider"
  | "spacer"
  | "button"
  | "html";

export interface ListingBlock {
  id: string;
  type: ListingBlockType;
  /** Section heading (about/description/details/reviews) or heading-block text. Token-bound. */
  heading?: string;
  /** Heading level for the heading block. */
  level?: 2 | 3 | 4;
  /** Body text (text block, button label). Token-bound. */
  text?: string;
  /** Raw HTML block (not token-bound; rendered after sanitize). */
  html?: string;
  /** Button destination. Tokens allowed (e.g. /listing/{{slug}}). */
  href?: string;
  /** Image: explicit asset id. */
  assetId?: string;
  /** Image: fallback to a listing field (avatar | feed | gallery). */
  field?: "avatar" | "feed" | "gallery";
  /** Image: external src. */
  src?: string;
  /** Gallery/reviews item limit. */
  limit?: number;
  /** Reviews: show owner responses. */
  showResponse?: boolean;
  /** Reviews: show "(N)" in the heading. */
  showCount?: boolean;
  /** Details: which groups to show. */
  items?: Array<"categories" | "areas" | "specialties" | "amenities" | "certifications" | "insurance" | "hours">;
  /** Spacer height in px. */
  height?: number;
  /** Visual variant hint (image/heading emphasis). */
  variant?: "default" | "muted" | "card" | "banner";
  align?: "left" | "center" | "right";
  color?: string;
  bgColor?: string;
  /** Skip rendering when the bound data is empty (gallery/reviews/map/video). */
  hideIfEmpty?: boolean;
}

export type SidebarWidgetType =
  | "contactForm"
  | "claim"
  | "hours"
  | "areas"
  | "categories"
  | "social"
  | "quickFacts"
  | "map"
  | "text"
  | "gallery";

export interface SidebarWidget {
  id: string;
  type: SidebarWidgetType;
  enabled: boolean;
  /** Widget heading override (token-bound). */
  title?: string;
  /** Text widget body (token-bound). */
  text?: string;
  limit?: number;
}

export type HeroVariant = "default" | "minimal" | "bold" | "corporate" | "warm" | "modern";
export type TemplateLayout = "single" | "sidebar";

export const HERO_VARIANTS: Array<{ value: HeroVariant; label: string }> = [
  { value: "default", label: "Default" },
  { value: "minimal", label: "Minimal" },
  { value: "bold", label: "Bold" },
  { value: "corporate", label: "Corporate" },
  { value: "warm", label: "Warm" },
  { value: "modern", label: "Modern" },
];

export const BLOCK_META: Array<{ type: ListingBlockType; label: string; description: string }> = [
  { type: "heading", label: "Heading", description: "Token-bound heading ({{title}}, {{city}}…)" },
  { type: "text", label: "Text", description: "Paragraph with data binding" },
  { type: "image", label: "Image", description: "Asset, external URL, or listing field" },
  { type: "gallery", label: "Gallery", description: "Listing gallery images" },
  { type: "video", label: "Video", description: "YouTube/Vimeo embed (auto-normalized)" },
  { type: "map", label: "Map", description: "Google Maps from URL or coordinates" },
  { type: "about", label: "About", description: "Listing summary" },
  { type: "description", label: "Full Description", description: "Listing description (HTML)" },
  { type: "details", label: "Details Grid", description: "Categories, areas, specialties…" },
  { type: "reviews", label: "Reviews", description: "Latest approved reviews" },
  { type: "reviewForm", label: "Review Form", description: "Write-a-review form" },
  { type: "divider", label: "Divider", description: "Horizontal rule" },
  { type: "spacer", label: "Spacer", description: "Vertical space" },
  { type: "button", label: "Button", description: "Link button with token-bound label" },
  { type: "html", label: "HTML", description: "Custom HTML snippet" },
];

export const SIDEBAR_WIDGET_META: Array<{ type: SidebarWidgetType; label: string; description: string }> = [
  { type: "contactForm", label: "Contact Form", description: "Lead capture form" },
  { type: "quickFacts", label: "Quick Facts", description: "Tier, rating, verified, member since" },
  { type: "hours", label: "Hours", description: "Compact hours list" },
  { type: "areas", label: "Areas Served", description: "Region chips" },
  { type: "categories", label: "Categories", description: "Category chips" },
  { type: "social", label: "Social Links", description: "Social profile icons" },
  { type: "map", label: "Map", description: "Location map" },
  { type: "claim", label: "Claim Card", description: "Own-this-business CTA" },
  { type: "gallery", label: "Gallery Strip", description: "Small gallery thumbnails" },
  { type: "text", label: "Text", description: "Custom token-bound text" },
];

export function newBlockId(): string {
  return `blk-${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlock(type: ListingBlockType): ListingBlock {
  const base: ListingBlock = { id: newBlockId(), type };
  switch (type) {
    case "heading":
      return { ...base, heading: "About {{title}}", level: 2 };
    case "text":
      return { ...base, text: "Learn more about {{title}} in {{city}}, {{state}}." };
    case "image":
      return { ...base, field: "avatar", variant: "card" };
    case "gallery":
      return { ...base, limit: 4, hideIfEmpty: true };
    case "video":
      return { ...base, hideIfEmpty: true };
    case "map":
      return { ...base, hideIfEmpty: true };
    case "about":
      return { ...base, heading: "About" };
    case "description":
      return { ...base, heading: "Description" };
    case "details":
      return { ...base, heading: "Details", items: ["categories", "areas", "specialties", "amenities", "certifications", "insurance", "hours"] };
    case "reviews":
      return { ...base, heading: "Reviews", limit: 3, showResponse: true, showCount: true, hideIfEmpty: true };
    case "reviewForm":
      return { ...base, heading: "Write a Review" };
    case "spacer":
      return { ...base, height: 24 };
    case "button":
      return { ...base, text: "Visit Website", href: "{{website}}", variant: "default" };
    case "html":
      return { ...base, html: "<p>Custom HTML</p>" };
    default:
      return base;
  }
}

export function createWidget(type: SidebarWidgetType): SidebarWidget {
  return { id: newBlockId(), type, enabled: true };
}

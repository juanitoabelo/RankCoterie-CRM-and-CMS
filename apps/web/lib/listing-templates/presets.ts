import type { HeroVariant, TemplateLayout } from "./types";
import type {
  ContainerSettings,
  ListingTemplateBlock,
  ListingHeroBlock,
  ListingAboutBlock,
  ListingDescriptionBlock,
  ListingDetailsBlock,
  ListingGalleryBlock,
  ListingVideoBlock,
  ListingMapBlock,
  ListingReviewsBlock,
  ListingReviewFormBlock,
  ListingContactFormBlock,
  ListingQuickFactsBlock,
  ListingHoursBlock,
  ListingAreasBlock,
  ListingCategoriesBlock,
  ListingSocialBlock,
  ListingClaimBlock,
} from "./tree-types";
import { DEFAULT_CONTAINER_SETTINGS } from "./tree-types";

/**
 * Built-in preset templates (tree model). Seeded into the DB (isPreset) on
 * first visit to the Listing Layouts admin; listings pick them like any
 * custom template. Every content string supports data-binding tokens
 * ({{title}}, {{city}}…); heading/title props connect to listing fields via
 * the bindings editor.
 */

export interface PresetTemplate {
  name: string;
  slug: string;
  description: string;
  layout: TemplateLayout;
  heroVariant: HeroVariant;
  blocks: ListingTemplateBlock[];
  containerSettings: ContainerSettings;
}

/* ── Local factories (stable ids so preset JSON is deterministic) ───────── */

function hero(heroVariant: HeroVariant, prefix: string): ListingHeroBlock {
  return {
    id: `${prefix}-hero`,
    type: "listingHero",
    props: {
      variant: heroVariant,
      showBreadcrumb: true,
      showCover: true,
      showAvatar: true,
      showBadges: true,
      showContact: true,
      showAddress: true,
      showSummary: false,
    },
  };
}

const about = (heading: string, prefix: string): ListingAboutBlock => ({
  id: `${prefix}-about`,
  type: "listingAbout",
  props: { heading },
});

const description = (heading: string, prefix: string): ListingDescriptionBlock => ({
  id: `${prefix}-description`,
  type: "listingDescription",
  props: { heading },
});

const details = (heading: string, prefix: string): ListingDetailsBlock => ({
  id: `${prefix}-details`,
  type: "listingDetails",
  props: {
    heading,
    items: ["categories", "areas", "specialties", "amenities", "certifications", "insurance", "hours"],
  },
});

const gallery = (limit: number, prefix: string): ListingGalleryBlock => ({
  id: `${prefix}-gallery`,
  type: "listingGallery",
  props: { limit, hideIfEmpty: true },
});

const video = (prefix: string): ListingVideoBlock => ({
  id: `${prefix}-video`,
  type: "listingVideo",
  props: { hideIfEmpty: true },
});

const map = (prefix: string): ListingMapBlock => ({
  id: `${prefix}-map`,
  type: "listingMap",
  props: { hideIfEmpty: true },
});

const reviews = (heading: string, limit: number, prefix: string): ListingReviewsBlock => ({
  id: `${prefix}-reviews`,
  type: "listingReviews",
  props: { heading, limit, showResponse: true, showCount: true, hideIfEmpty: true },
});

const reviewForm = (heading: string, prefix: string): ListingReviewFormBlock => ({
  id: `${prefix}-review-form`,
  type: "listingReviewForm",
  props: { heading },
});

const contactForm = (title: string, prefix: string): ListingContactFormBlock => ({
  id: `${prefix}-contact`,
  type: "listingContactForm",
  props: { title },
});

const quickFacts = (prefix: string): ListingQuickFactsBlock => ({
  id: `${prefix}-facts`,
  type: "listingQuickFacts",
  props: {},
});

const hours = (prefix: string): ListingHoursBlock => ({
  id: `${prefix}-hours`,
  type: "listingHours",
  props: { title: "Hours" },
});

const areas = (prefix: string): ListingAreasBlock => ({
  id: `${prefix}-areas`,
  type: "listingAreas",
  props: { title: "Areas Served" },
});

const categories = (prefix: string): ListingCategoriesBlock => ({
  id: `${prefix}-categories`,
  type: "listingCategories",
  props: { title: "Categories" },
});

const social = (prefix: string): ListingSocialBlock => ({
  id: `${prefix}-social`,
  type: "listingSocial",
  props: { title: "Connect" },
});

const claim = (prefix: string): ListingClaimBlock => ({
  id: `${prefix}-claim`,
  type: "listingClaim",
  props: {},
});

/** Wrap main + optional sidebar blocks in the standard 8+4 (or 12) section. */
function layoutSection(
  prefix: string,
  main: ListingTemplateBlock[],
  side: ListingTemplateBlock[],
): ListingTemplateBlock {
  const columns =
    side.length > 0
      ? [
          { id: `${prefix}-col-main`, span: 8, blocks: main as ListingTemplateBlock[] },
          { id: `${prefix}-col-side`, span: 4, blocks: side as ListingTemplateBlock[] },
        ]
      : [{ id: `${prefix}-col-main`, span: 12, blocks: main as ListingTemplateBlock[] }];

  return {
    id: `${prefix}-section`,
    type: "section",
    props: {
      rows: [
        {
          id: `${prefix}-row`,
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
  } as ListingTemplateBlock;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: "Minimal",
    slug: "minimal",
    description: "Single-column, text-forward layout with a quiet hero and generous spacing.",
    layout: "single",
    heroVariant: "minimal",
    containerSettings: DEFAULT_CONTAINER_SETTINGS,
    blocks: [
      hero("minimal", "minimal"),
      layoutSection(
        "minimal",
        [
          gallery(6, "minimal"),
          about("About", "minimal"),
          description("Full Description", "minimal"),
          details("Details", "minimal"),
          reviews("Reviews", 3, "minimal"),
          reviewForm("Write a Review", "minimal"),
        ],
        [],
      ),
    ],
  },
  {
    name: "Bold",
    slug: "bold",
    description: "High-contrast dark hero, strong headings, full media — gallery, video, and map front and center.",
    layout: "sidebar",
    heroVariant: "bold",
    containerSettings: DEFAULT_CONTAINER_SETTINGS,
    blocks: [
      hero("bold", "bold"),
      layoutSection(
        "bold",
        [
          gallery(8, "bold"),
          video("bold"),
          map("bold"),
          about("About {{title}}", "bold"),
          description("What We Do", "bold"),
          details("At a Glance", "bold"),
          reviews("Customer Reviews", 5, "bold"),
          reviewForm("Share Your Experience", "bold"),
        ],
        [
          quickFacts("bold"),
          contactForm("Get in Touch", "bold"),
          social("bold"),
          claim("bold"),
        ],
      ),
    ],
  },
  {
    name: "Corporate",
    slug: "corporate",
    description: "Business-first layout with a structured sidebar: contact, hours, coverage areas, and credentials.",
    layout: "sidebar",
    heroVariant: "corporate",
    containerSettings: DEFAULT_CONTAINER_SETTINGS,
    blocks: [
      hero("corporate", "corporate"),
      layoutSection(
        "corporate",
        [
          about("Company Overview", "corporate"),
          description("About the Business", "corporate"),
          details("Services & Credentials", "corporate"),
          reviews("Client Feedback", 5, "corporate"),
          reviewForm("Write a Review", "corporate"),
        ],
        [
          contactForm("Request a Consultation", "corporate"),
          quickFacts("corporate"),
          hours("corporate"),
          areas("corporate"),
          categories("corporate"),
          social("corporate"),
          claim("corporate"),
        ],
      ),
    ],
  },
  {
    name: "Warm",
    slug: "warm",
    description: "Friendly, approachable feel with gallery, generous about copy, and a welcoming contact card.",
    layout: "sidebar",
    heroVariant: "warm",
    containerSettings: DEFAULT_CONTAINER_SETTINGS,
    blocks: [
      hero("warm", "warm"),
      layoutSection(
        "warm",
        [
          gallery(6, "warm"),
          about("Meet {{title}}", "warm"),
          description("Our Story", "warm"),
          details("Good to Know", "warm"),
          reviews("Kind Words", 5, "warm"),
          reviewForm("Leave a Review", "warm"),
        ],
        [
          contactForm("Say Hello", "warm"),
          hours("warm"),
          areas("warm"),
          social("warm"),
          claim("warm"),
        ],
      ),
    ],
  },
  {
    name: "Modern",
    slug: "modern",
    description: "Media-rich single flow: hero gallery, map, video, then details — with a compact utility sidebar.",
    layout: "sidebar",
    heroVariant: "modern",
    containerSettings: DEFAULT_CONTAINER_SETTINGS,
    blocks: [
      hero("modern", "modern"),
      layoutSection(
        "modern",
        [
          gallery(8, "modern"),
          video("modern"),
          map("modern"),
          about("Overview", "modern"),
          description("Details", "modern"),
          details("Business Info", "modern"),
          reviews("Reviews", 6, "modern"),
          reviewForm("Write a Review", "modern"),
        ],
        [
          contactForm("Contact", "modern"),
          quickFacts("modern"),
          categories("modern"),
          areas("modern"),
          social("modern"),
          claim("modern"),
        ],
      ),
    ],
  },
];

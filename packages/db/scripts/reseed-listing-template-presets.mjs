/**
 * One-off migration: rewrite the 5 built-in ListingTemplate preset rows from
 * the legacy flat model (blocks + sidebar arrays) to the tree model
 * { blocks: Block[], containerSettings }. Source of truth for fresh installs
 * remains apps/web/lib/listing-templates/presets.ts (ensureListingTemplatePresets).
 *
 * Run: node scripts/reseed-listing-template-presets.mjs   (from packages/db)
 */
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

/* Load DATABASE_URL from .env (node doesn't do this automatically). */
for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
}

const DEFAULT_CONTAINER_SETTINGS = {
  width: "full",
  maxWidth: 1200,
  bgColor: "",
  bgImage: "",
  bgPosition: "center center",
  bgSize: "cover",
  bgRepeat: "no-repeat",
  overlayColor: "",
  overlayOpacity: 0,
  borderStyle: "none",
  borderWidth: 0,
  borderColor: "",
  borderRadius: 0,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  padding: { top: 0, right: 0, bottom: 0, left: 0 },
  minHeight: 0,
  direction: "column",
  justifyContent: "flex-start",
  alignItems: "stretch",
  gapCol: 0,
  gapRow: 0,
  wrap: "nowrap",
  zindex: 1,
};

function hero(variant, prefix) {
  return {
    id: `${prefix}-hero`,
    type: "listingHero",
    props: {
      variant,
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
const about = (heading, prefix) => ({ id: `${prefix}-about`, type: "listingAbout", props: { heading } });
const description = (heading, prefix) => ({ id: `${prefix}-description`, type: "listingDescription", props: { heading } });
const details = (heading, prefix) => ({
  id: `${prefix}-details`,
  type: "listingDetails",
  props: {
    heading,
    items: ["categories", "areas", "specialties", "amenities", "certifications", "insurance", "hours"],
  },
});
const gallery = (limit, prefix) => ({ id: `${prefix}-gallery`, type: "listingGallery", props: { limit, hideIfEmpty: true } });
const video = (prefix) => ({ id: `${prefix}-video`, type: "listingVideo", props: { hideIfEmpty: true } });
const map = (prefix) => ({ id: `${prefix}-map`, type: "listingMap", props: { hideIfEmpty: true } });
const reviews = (heading, limit, prefix) => ({
  id: `${prefix}-reviews`,
  type: "listingReviews",
  props: { heading, limit, showResponse: true, showCount: true, hideIfEmpty: true },
});
const reviewForm = (heading, prefix) => ({ id: `${prefix}-review-form`, type: "listingReviewForm", props: { heading } });
const contactForm = (title, prefix) => ({ id: `${prefix}-contact`, type: "listingContactForm", props: { title } });
const quickFacts = (prefix) => ({ id: `${prefix}-facts`, type: "listingQuickFacts", props: {} });
const hours = (prefix) => ({ id: `${prefix}-hours`, type: "listingHours", props: { title: "Hours" } });
const areas = (prefix) => ({ id: `${prefix}-areas`, type: "listingAreas", props: { title: "Areas Served" } });
const categories = (prefix) => ({ id: `${prefix}-categories`, type: "listingCategories", props: { title: "Categories" } });
const social = (prefix) => ({ id: `${prefix}-social`, type: "listingSocial", props: { title: "Connect" } });
const claim = (prefix) => ({ id: `${prefix}-claim`, type: "listingClaim", props: {} });

function layoutSection(prefix, main, side) {
  const columns =
    side.length > 0
      ? [
          { id: `${prefix}-col-main`, span: 8, blocks: main },
          { id: `${prefix}-col-side`, span: 4, blocks: side },
        ]
      : [{ id: `${prefix}-col-main`, span: 12, blocks: main }];
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
  };
}

const PRESETS = {
  minimal: [
    hero("minimal", "minimal"),
    layoutSection("minimal", [
      gallery(6, "minimal"),
      about("About", "minimal"),
      description("Full Description", "minimal"),
      details("Details", "minimal"),
      reviews("Reviews", 3, "minimal"),
      reviewForm("Write a Review", "minimal"),
    ], []),
  ],
  bold: [
    hero("bold", "bold"),
    layoutSection("bold", [
      gallery(8, "bold"),
      video("bold"),
      map("bold"),
      about("About {{title}}", "bold"),
      description("What We Do", "bold"),
      details("At a Glance", "bold"),
      reviews("Customer Reviews", 5, "bold"),
      reviewForm("Share Your Experience", "bold"),
    ], [
      quickFacts("bold"),
      contactForm("Get in Touch", "bold"),
      social("bold"),
      claim("bold"),
    ]),
  ],
  corporate: [
    hero("corporate", "corporate"),
    layoutSection("corporate", [
      about("Company Overview", "corporate"),
      description("About the Business", "corporate"),
      details("Services & Credentials", "corporate"),
      reviews("Client Feedback", 5, "corporate"),
      reviewForm("Write a Review", "corporate"),
    ], [
      contactForm("Request a Consultation", "corporate"),
      quickFacts("corporate"),
      hours("corporate"),
      areas("corporate"),
      categories("corporate"),
      social("corporate"),
      claim("corporate"),
    ]),
  ],
  warm: [
    hero("warm", "warm"),
    layoutSection("warm", [
      gallery(6, "warm"),
      about("Meet {{title}}", "warm"),
      description("Our Story", "warm"),
      details("Good to Know", "warm"),
      reviews("Kind Words", 5, "warm"),
      reviewForm("Leave a Review", "warm"),
    ], [
      contactForm("Say Hello", "warm"),
      hours("warm"),
      areas("warm"),
      social("warm"),
      claim("warm"),
    ]),
  ],
  modern: [
    hero("modern", "modern"),
    layoutSection("modern", [
      gallery(8, "modern"),
      video("modern"),
      map("modern"),
      about("Overview", "modern"),
      description("Details", "modern"),
      details("Business Info", "modern"),
      reviews("Reviews", 6, "modern"),
      reviewForm("Write a Review", "modern"),
    ], [
      contactForm("Contact", "modern"),
      quickFacts("modern"),
      categories("modern"),
      areas("modern"),
      social("modern"),
      claim("modern"),
    ]),
  ],
};

const prisma = new PrismaClient();
try {
  for (const [slug, blocks] of Object.entries(PRESETS)) {
    const result = await prisma.listingTemplate.updateMany({
      where: { slug, isPreset: true },
      data: { blocks: { blocks, containerSettings: DEFAULT_CONTAINER_SETTINGS } },
    });
    console.log(`${slug}: ${result.count} row(s) updated`);
  }
} finally {
  await prisma.$disconnect();
}

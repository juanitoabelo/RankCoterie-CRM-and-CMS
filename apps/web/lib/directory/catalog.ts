/**
 * Canopy V2 — directory catalog data-access seam.
 *
 * Pages depend on the `CatalogRepo` interface, NOT on Prisma directly. This lets the
 * `/g/` SEO pages compile and render with mock data during Phase 1, and later swap in a
 * Prisma-backed repo (plus the visibility gate from `./visibility`) with zero page changes.
 *
 * SEO tokens live in `stateInit`/`cityInit`/`custom1`/`custom2` strings exactly as authored
 * in the legacy GeoCategory admin (canopy-architecture.md §6.5).
 */

import type { ExclusionRule, ListingTier, ListingStatus } from "./visibility";
import { getMockExclusions } from "./mockExclusions";

export interface CatalogCategory {
  id: string;
  slug: string; // legacy DomainKey, e.g. "wilderness-therapy"
  title: string;
  parentSlug: string | null; // top-level categories have null
  description: string; // category-level blob, tokens allowed
  stateInit: string | null; // state intro, tokens allowed
  stateDesc: string | null;
  cityInit: string | null;
  cityDesc: string | null;
}

export interface CatalogRegion {
  id: string;
  state: string; // "CA"
  stateFull: string; // "California"
  city: string | null; // null = state row
  areaPart: "NORTHERN" | "SOUTHERN" | "EASTERN" | "WESTERN" | "CENTRAL" | null;
  slug: string; // legacy DomainKey, e.g. "San-Diego-California-CA"
  custom1: string | null; // region-authored intro, tokens allowed
  custom2: string | null;
  priority: number;
}

/** Per-category, per-state/area overrides — legacy tblSearchCategoryRegionContent. */
export interface CategoryRegionContent {
  categoryId: string;
  state: string;
  areaPart: "ALL" | "NORTHERN" | "SOUTHERN" | "EASTERN" | "WESTERN" | "CENTRAL";
  text: string; // tokens allowed
}

export interface CatalogListing {
  id: string;
  title: string;
  slug: string; // unique
  domainKey: string | null; // drives exclusion matching
  companyName: string | null;
  city: string | null;
  state: string | null;
  summary: string | null;
  phone: string | null;
  website: string | null;
  avatarImage: string | null;
  tier: ListingTier;
  status: ListingStatus;
  freeGraceUntil: Date | null;
  paymentGraceUntil: Date | null;
  isLandingPage: boolean;
  createdAt: Date;
}

export interface CategoryRegionContentQuery {
  categoryId: string;
  state: string;
}

export interface CatalogRepo {
  getCategories(): Promise<CatalogCategory[]>;
  getCategoryBySlug(slug: string): Promise<CatalogCategory | null>;
  getRegions(): Promise<CatalogRegion[]>;
  getRegionBySlug(slug: string): Promise<CatalogRegion | null>;
  /** State-index regions that have content (legacy: Custom1/Custom2 non-empty). */
  getIndexedStateRegions(categoryId: string): Promise<CatalogRegion[]>;
  /** State + city regions under a parent category, per-state index. */
  getChildRegions(categoryId: string, state: string): Promise<CatalogRegion[]>;
  getCategoryRegionContent(query: CategoryRegionContentQuery): Promise<CategoryRegionContent[]>;
  /** Candidate listings for a category × region (visibility applied by caller). */
  getListingsByCategoryAndRegion(
    categoryId: string,
    regionId: "ALL" | string,
  ): Promise<CatalogListing[]>;
  /** Admin-managed opt-out list, fed straight into the visibility gate. */
  getExclusions(): Promise<ExclusionRule[]>;
}

/* ------------------------------------------------------------------ Mock seed
 * Models the real masternet.org sample data (clearviewhorizon.com + cats/regions),
 * sufficient to render and exercise every page during Phase 1.
 * ------------------------------------------------------------------ */

const REGIONS: CatalogRegion[] = [
  {
    id: "CA",
    state: "CA",
    stateFull: "California",
    city: null,
    areaPart: null,
    slug: "California-CA",
    custom1:
      "<h3>Christian Programs for Troubled Teen Girls {{in region}}</h3><p>Families searching {{in region}} for a Christ-centered program will find proven residential options here.</p>",
    custom2: null,
    priority: 1,
  },
  {
    id: "CA-San-Diego",
    state: "CA",
    stateFull: "California",
    city: "San Diego",
    areaPart: "SOUTHERN",
    slug: "San-Diego-California-CA",
    custom1: "<p>San Diego families {{in region}} have trusted these programs for generations.</p>",
    custom2: null,
    priority: 2,
  },
  {
    id: "VA",
    state: "VA",
    stateFull: "Virginia",
    city: null,
    areaPart: null,
    slug: "Virginia-VA",
    custom1: "<h3>Christian Programs for Troubled Teen Girls {{in region}}</h3><p>Virginia families {{in region}} find care close to home.</p>",
    custom2: null,
    priority: 1,
  },
  {
    id: "TX",
    state: "TX",
    stateFull: "Texas",
    city: null,
    areaPart: null,
    slug: "Texas-TX",
    custom1: null, // no content → not listed in the state index
    custom2: null,
    priority: 99,
  },
];

const CATEGORIES: CatalogCategory[] = [
  {
    id: "cat-wilderness",
    slug: "wilderness-therapy",
    title: "Wilderness Therapy for Troubled Teen Girls",
    parentSlug: null,
    description:
      "Wilderness therapy programs help girls {{in region}} rebuild confidence and trust in a Christ-centered outdoor setting.",
    stateInit:
      "Find wilderness therapy programs for girls {{in region}} — safe, faith-based and staffed by licensed counselors.",
    stateDesc:
      "Our {{region}} wilderness therapy directory lists programs that combine clinical care with the healing power of creation.",
    cityInit:
      "Families {{from region}} searching for wilderness therapy will find vetted Christian programs below.",
    cityDesc: "Compare wilderness therapy options serving the {{region}} area.",
  },
  {
    id: "cat-boarding",
    slug: "christian-boarding-schools",
    title: "Christian Boarding Schools for Troubled Girls",
    parentSlug: null,
    description:
      "Christian boarding schools {{in region}} provide structure, academics and spiritual growth for struggling teen girls.",
    stateInit:
      "Explore accredited Christian boarding schools for girls {{in region}} and nearby states.",
    stateDesc: "A directory of faith-based boarding schools serving {{region}}.",
    cityInit: "Christian boarding schools for girls {{near region}} are listed below.",
    cityDesc: null,
  },
];

const REGION_CONTENT: CategoryRegionContent[] = [
  {
    categoryId: "cat-wilderness",
    state: "CA",
    areaPart: "SOUTHERN",
    text: "<p><em>Southern California families</em>: a curated list of wilderness programs serving {{region}}.</p>",
  },
];

const TODAY = new Date("2026-01-15T00:00:00Z");

const LISTINGS: CatalogListing[] = [
  {
    id: "l-clearview",
    title: "Clearview Horizon",
    slug: "clearview-horizon",
    domainKey: "clearview-horizon",
    companyName: "Clearview Horizon",
    city: "San Diego",
    state: "CA",
    summary:
      "Christ-centered residential treatment center for troubled teen girls, licensed in California and serving families {{in region}} for 25+ years.",
    phone: "(888) 984-6879",
    website: "https://www.clearviewhorizon.com/",
    avatarImage: null,
    tier: "PREMIUM",
    status: "LIVE",
    freeGraceUntil: null,
    paymentGraceUntil: null,
    isLandingPage: true,
    createdAt: TODAY,
  },
  {
    id: "l-hidden",
    title: "A Competitor, Inc.",
    slug: "a-competitor-inc",
    domainKey: "a-competitor-inc",
    companyName: "A Competitor Inc",
    city: "Sacramento",
    state: "CA",
    summary: "A program the operator has chosen not to display.",
    phone: null,
    website: null,
    avatarImage: null,
    tier: "SUPPRESSED", // admin opt-out — must never render
    status: "LIVE",
    freeGraceUntil: null,
    paymentGraceUntil: null,
    isLandingPage: true,
    createdAt: TODAY,
  },
  {
    id: "l-grace",
    title: "Grace Community Homes",
    slug: "grace-community-homes",
    domainKey: "grace-community-homes",
    companyName: "Grace Community Homes",
    city: "San Diego",
    state: "CA",
    summary: "Legacy free listing still inside its migration grace window.",
    phone: "(435) 899-9997",
    website: null,
    avatarImage: null,
    tier: "FREE",
    status: "LIVE",
    freeGraceUntil: new Date("2026-04-01T00:00:00Z"), // visible until grace expires
    paymentGraceUntil: null,
    isLandingPage: true,
    createdAt: TODAY,
  },
];

export const catalogRepo: CatalogRepo = {
  async getCategories() {
    return CATEGORIES;
  },
  async getCategoryBySlug(slug) {
    return CATEGORIES.find((c) => c.slug === slug) ?? null;
  },
  async getRegions() {
    return REGIONS;
  },
  async getRegionBySlug(slug) {
    return REGIONS.find((r) => r.slug === slug) ?? null;
  },
  async getIndexedStateRegions() {
    // Legacy: only states with content (custom1/custom2) enter the parent index.
    return REGIONS.filter((r) => r.city === null && (r.custom1 || r.custom2));
  },
  async getChildRegions(_categoryId, state) {
    return REGIONS.filter((r) => r.state === state && r.city !== null);
  },
  async getCategoryRegionContent({ categoryId, state }) {
    return REGION_CONTENT.filter((c) => c.categoryId === categoryId && c.state === state);
  },
  async getListingsByCategoryAndRegion(_categoryId, _regionId) {
    return LISTINGS; // seed has one region-scope; real repo will filter by regionId
  },
  async getExclusions() {
    return getMockExclusions();
  },
};

export async function getCatalogRepo(): Promise<CatalogRepo> {
  if (process.env.CATALOG_REPO === "prisma") {
    const { prismaCatalogRepo } = await import("./prismaCatalog");
    return prismaCatalogRepo;
  }
  return catalogRepo;
}
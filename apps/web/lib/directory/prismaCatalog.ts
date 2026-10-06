/**
 * Canopy V2 — Prisma-backed CatalogRepo (§6.5 / §6.7).
 *
 * Implements the `CatalogRepo` seam from `./catalog` against the PostgreSQL schema.
 * Swap is env-driven: `getCatalogRepo()` returns this when CATALOG_REPO=prisma.
 *
 * Tenancy: every query is scoped to a single tenant (legacy masternet.org). The real
 * hostname→tenant resolution (§6.5 tenancy) lands later; `CANOPY_TENANT_ID` overrides.
 */

import { PrismaClient } from "@prisma/client";
import type {
  CatalogCategory,
  CatalogListing,
  CatalogRegion,
  CatalogRepo,
  CategoryRegionContent,
  CategoryRegionContentQuery,
} from "./catalog";
import type { ExclusionRule, ListingTier, ListingStatus } from "./visibility";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

function mapKeywords(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapCategory(c: {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  stateInit: string | null;
  stateDesc: string | null;
  cityInit: string | null;
  cityDesc: string | null;
  seoTitle: string | null;
  metaDesc: string | null;
  metaKeywords: string | null;
  focusKeyphrase: string | null;
  ogImage: string | null;
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  jsonSchema: string | null;
  parent: { slug: string } | null;
}): CatalogCategory {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    parentSlug: c.parent?.slug ?? null,
    description: c.description ?? "",
    stateInit: c.stateInit,
    stateDesc: c.stateDesc,
    cityInit: c.cityInit,
    cityDesc: c.cityDesc,
    seoTitle: c.seoTitle,
    metaDesc: c.metaDesc,
    metaKeywords: mapKeywords(c.metaKeywords),
    focusKeyphrase: c.focusKeyphrase,
    ogImage: c.ogImage,
    canonicalUrl: c.canonicalUrl,
    robotsIndex: c.robotsIndex,
    robotsFollow: c.robotsFollow,
    jsonSchema: c.jsonSchema,
  };
}

function mapRegion(r: {
  id: string;
  state: string;
  stateFull: string;
  city: string | null;
  areaPart: "ALL" | "NORTHERN" | "SOUTHERN" | "EASTERN" | "WESTERN" | "CENTRAL" | null;
  slug: string;
  custom1: string | null;
  custom2: string | null;
  priority: number;
}): CatalogRegion {
  return {
    id: r.id,
    state: r.state,
    stateFull: r.stateFull,
    city: r.city,
    areaPart: r.areaPart === "ALL" ? null : r.areaPart,
    slug: r.slug,
    custom1: r.custom1,
    custom2: r.custom2,
    priority: r.priority,
  };
}

function mapListing(l: {
  id: string;
  title: string;
  slug: string;
  domainKey: string | null;
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
  isLandingPage: boolean;
  createdAt: Date;
  subscription: { paymentGraceUntil: Date | null } | null;
}): CatalogListing {
  return {
    id: l.id,
    title: l.title,
    slug: l.slug,
    domainKey: l.domainKey,
    companyName: l.companyName,
    city: l.city,
    state: l.state,
    summary: l.summary,
    phone: l.phone,
    website: l.website,
    avatarImage: l.avatarImage,
    tier: l.tier,
    status: l.status,
    freeGraceUntil: l.freeGraceUntil,
    paymentGraceUntil: l.subscription?.paymentGraceUntil ?? null,
    isLandingPage: l.isLandingPage,
    createdAt: l.createdAt,
  };
}

export const prismaCatalogRepo: CatalogRepo = {
  async getCategories() {
    const rows = await prisma.category.findMany({
      where: { tenantId: TENANT_ID, status: "LIVE" },
      include: { parent: { select: { slug: true } } },
      orderBy: { slug: "asc" },
    });
    return rows.map(mapCategory);
  },

  async getCategoryBySlug(slug) {
    const row = await prisma.category.findFirst({
      where: { tenantId: TENANT_ID, slug, status: "LIVE" },
      include: { parent: { select: { slug: true } } },
    });
    return row ? mapCategory(row) : null;
  },

  async getRegions() {
    const rows = await prisma.region.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: [{ priority: "asc" }, { id: "asc" }],
    });
    return rows.map(mapRegion);
  },

  async getRegionBySlug(slug) {
    const row = await prisma.region.findFirst({
      where: { tenantId: TENANT_ID, slug },
    });
    return row ? mapRegion(row) : null;
  },

  async getChildRegions(_categoryId, state) {
    const rows = await prisma.region.findMany({
      where: { tenantId: TENANT_ID, state, city: { not: null } },
      orderBy: { priority: "asc" },
    });
    return rows.map(mapRegion);
  },

  async getCategoryRegionContent({ categoryId, state }: CategoryRegionContentQuery) {
    const rows = await prisma.categoryRegionContent.findMany({
      where: { categoryId, ...(state ? { state } : {}) },
    });
    return rows.map(
      (c): CategoryRegionContent => ({
        categoryId: c.categoryId,
        state: c.state,
        areaPart: c.areaPart,
        text: c.customText,
        faq: (c.faq as Array<{ q: string; a: string }> | null) ?? [],
      }),
    );
  },

  async getListingsByCategoryAndRegion(categoryId, regionId) {
    const rows = await prisma.listing.findMany({
      where: {
        tenantId: TENANT_ID,
        categories: { some: { categoryId } },
        ...(regionId === "ALL" ? {} : { regions: { some: { regionId } } }),
      },
      include: { subscription: { select: { paymentGraceUntil: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapListing);
  },

  async getCategoryListingCandidates(categoryId) {
    const rows = await prisma.listing.findMany({
      where: {
        tenantId: TENANT_ID,
        categories: { some: { categoryId } },
      },
      include: {
        subscription: { select: { paymentGraceUntil: true } },
        regions: { select: { regionId: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      listing: mapListing(row),
      regionIds: row.regions.map((r) => r.regionId),
    }));
  },

  async getExclusions(): Promise<ExclusionRule[]> {
    const rows = await prisma.excludedCompany.findMany({
      where: { tenantId: TENANT_ID, isActive: true },
    });
    return rows.map((e) =>
      e.domainKey ? { domainKey: e.domainKey } : { companyNameContains: e.companyName },
    );
  },
};

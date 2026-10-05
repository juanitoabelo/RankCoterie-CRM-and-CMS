import { afterEach, describe, expect, it } from "vitest";
import type { CatalogRegion, CategoryRegionContent } from "./catalog";
import { catalogRepo } from "./catalog";
import {
  clearIndexGateCache,
  filterIndexableRegions,
  hasAuthoredRegionContent,
  isRegionIndexable,
  regionPageHasListings,
  resolveRegionIndexable,
  resolveRegionListingCounts,
} from "./indexGate";

afterEach(() => {
  clearIndexGateCache();
});

const CAT = "cat-wilderness";

function region(overrides: Partial<CatalogRegion> & Pick<CatalogRegion, "id" | "state">): CatalogRegion {
  return {
    stateFull: "Testland",
    city: null,
    areaPart: null,
    slug: overrides.id,
    custom1: null,
    custom2: null,
    priority: 1,
    ...overrides,
  };
}

const ALL_CONTENT: CategoryRegionContent[] = [
  { categoryId: CAT, state: "CA", areaPart: "ALL", text: "<p>state-wide</p>" },
  { categoryId: CAT, state: "NY", areaPart: "SOUTHERN", text: "<p>area</p>" },
];

describe("hasAuthoredRegionContent", () => {
  it("accepts region-level custom1/custom2 (trimmed)", () => {
    expect(hasAuthoredRegionContent(region({ id: "A", state: "TX", custom1: "<p>x</p>" }), [])).toBe(true);
    expect(hasAuthoredRegionContent(region({ id: "A", state: "TX", custom2: "  " }), [])).toBe(false);
  });

  it("matches a state against an areaPart ALL row only", () => {
    expect(hasAuthoredRegionContent(region({ id: "A", state: "CA" }), ALL_CONTENT)).toBe(true);
    // State page never matches non-ALL rows (mirrors resolveContent).
    expect(hasAuthoredRegionContent(region({ id: "B", state: "NY" }), ALL_CONTENT)).toBe(false);
  });

  it("matches a city against its own areaPart, never against ALL", () => {
    const city = region({ id: "C", state: "NY", city: "Big", areaPart: "SOUTHERN" });
    expect(hasAuthoredRegionContent(city, ALL_CONTENT)).toBe(true);
    const caCity = region({ id: "D", state: "CA", city: "Small", areaPart: "WESTERN" });
    expect(hasAuthoredRegionContent(caCity, ALL_CONTENT)).toBe(false);
  });

  it("falls back to false for shared-boilerplate-only regions", () => {
    expect(hasAuthoredRegionContent(region({ id: "E", state: "TX" }), ALL_CONTENT)).toBe(false);
  });
});

describe("isRegionIndexable", () => {
  it("requires listings or authored content", () => {
    expect(isRegionIndexable({ hasAuthoredContent: false, visibleListingCount: 0 })).toBe(false);
    expect(isRegionIndexable({ hasAuthoredContent: true, visibleListingCount: 0 })).toBe(true);
    expect(isRegionIndexable({ hasAuthoredContent: false, visibleListingCount: 3 })).toBe(true);
    expect(isRegionIndexable({ hasAuthoredContent: true, visibleListingCount: 3 })).toBe(true);
  });
});

describe("regionPageHasListings", () => {
  it("keeps page 1 iff the region has any listings", () => {
    expect(regionPageHasListings(0, 1)).toBe(false);
    expect(regionPageHasListings(1, 1)).toBe(true);
  });

  it("requires spill-over for page N (guards the clamped /page/2/ duplicate)", () => {
    expect(regionPageHasListings(10, 2)).toBe(false); // exactly one page of listings
    expect(regionPageHasListings(11, 2)).toBe(true);
    expect(regionPageHasListings(21, 3)).toBe(true);
    expect(regionPageHasListings(20, 3)).toBe(false);
  });

  it("treats invalid page numbers as page 1", () => {
    expect(regionPageHasListings(1, Number.NaN)).toBe(true);
    expect(regionPageHasListings(0, 0)).toBe(false);
  });
});

describe("resolveRegionListingCounts (mock repo)", () => {
  it("counts only visible listings per linked region", async () => {
    const counts = await resolveRegionListingCounts(catalogRepo, CAT);
    // TX/VA have no linked listings; CA/SD are linked but capped by visibility
    // (SUPPRESSED never counts; grace-window FREE counts only until expiry).
    expect(counts.get("TX") ?? 0).toBe(0);
    expect(counts.get("VA") ?? 0).toBe(0);
    expect(counts.get("CA") ?? 0).toBeGreaterThanOrEqual(1);
    expect(counts.get("CA") ?? 0).toBeLessThanOrEqual(2);
    expect(counts.get("CA-San-Diego") ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("memoizes per category for the TTL window", async () => {
    clearIndexGateCache();
    let calls = 0;
    const spy = {
      ...catalogRepo,
      getCategoryListingCandidates: async (categoryId: string) => {
        calls += 1;
        return catalogRepo.getCategoryListingCandidates(categoryId);
      },
    };
    await resolveRegionListingCounts(spy, CAT);
    await resolveRegionListingCounts(spy, CAT);
    expect(calls).toBe(1);
  });
});

describe("resolveRegionIndexable / filterIndexableRegions (mock repo)", () => {
  it("excludes regions with neither listings nor authored content", async () => {
    const tx = region({ id: "TX", state: "TX", slug: "Texas-TX" });
    expect(await resolveRegionIndexable(catalogRepo, CAT, tx)).toBe(false);

    const va = region({ id: "VA", state: "VA", slug: "Virginia-VA", custom1: "<p>x</p>" });
    expect(await resolveRegionIndexable(catalogRepo, CAT, va)).toBe(true);
  });

  it("keeps listings-only regions (content not required when listings exist)", async () => {
    const caNoAuthored = region({ id: "CA", state: "CA", slug: "California-CA" });
    expect(await resolveRegionIndexable(catalogRepo, CAT, caNoAuthored)).toBe(true);
  });

  it("filters to the indexable set in input order — link set === index set", async () => {
    const regions = await catalogRepo.getRegions();
    const indexable = await filterIndexableRegions(catalogRepo, CAT, regions);
    expect(indexable.map((r) => r.slug)).toEqual([
      "California-CA",
      "San-Diego-California-CA",
      "Virginia-VA",
    ]);
    expect(indexable.map((r) => r.id)).not.toContain("TX");
  });
});

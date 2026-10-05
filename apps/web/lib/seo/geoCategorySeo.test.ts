import { describe, expect, it } from "vitest";
import type { CatalogCategory, CatalogRegion } from "@/lib/directory/catalog";
import {
  breadcrumbJsonLd,
  geoCategoryUrl,
  geoRegionUrl,
  itemListJsonLd,
  jsonLdHtml,
  parentGeoMetadata,
  parseJsonSchema,
  regionGeoMetadata,
  regionPageGeoMetadata,
} from "./geoCategorySeo";

const baseCategory: CatalogCategory = {
  id: "cat-1",
  slug: "wilderness-therapy",
  title: "Wilderness Therapy",
  parentSlug: null,
  description: "Programs help girls {{in region}}.",
  stateInit: null,
  stateDesc: null,
  cityInit: null,
  cityDesc: null,
  seoTitle: null,
  metaDesc: null,
  metaKeywords: [],
  focusKeyphrase: null,
  ogImage: null,
  canonicalUrl: null,
  robotsIndex: true,
  robotsFollow: true,
  jsonSchema: null,
};

const stateRegion: CatalogRegion = {
  id: "CA",
  state: "CA",
  stateFull: "California",
  city: null,
  areaPart: null,
  slug: "California-CA",
  custom1: null,
  custom2: null,
  priority: 1,
};

const cityRegion: CatalogRegion = {
  ...stateRegion,
  id: "CA-SD",
  city: "San Diego",
  slug: "San-Diego-California-CA",
};

describe("parentGeoMetadata", () => {
  it("self-canonicalizes when no admin canonical is set", () => {
    const meta = parentGeoMetadata(baseCategory);
    expect(meta.alternates?.canonical).toBe(geoCategoryUrl("wilderness-therapy"));
  });

  it("honors an admin canonical URL on the parent page", () => {
    const meta = parentGeoMetadata({ ...baseCategory, canonicalUrl: "https://example.com/canonical" });
    expect(meta.alternates?.canonical).toBe("https://example.com/canonical");
  });

  it("strips region tokens from the admin SEO title", () => {
    const meta = parentGeoMetadata({ ...baseCategory, seoTitle: "Wilderness Therapy {{in region}}" });
    expect(meta.title).toBe("Wilderness Therapy");
  });

  it("falls back to the category description and honors robots settings", () => {
    const meta = parentGeoMetadata({ ...baseCategory, robotsIndex: false, robotsFollow: false });
    expect(meta.description).toBe("Programs help girls .");
    expect(meta.robots).toEqual({ index: false, follow: false });
  });

  it("passes meta keywords through", () => {
    const meta = parentGeoMetadata({ ...baseCategory, metaKeywords: ["wilderness", "therapy"] });
    expect(meta.keywords).toEqual(["wilderness", "therapy"]);
  });
});

describe("regionGeoMetadata", () => {
  it("always self-canonicalizes, even when an admin canonical exists", () => {
    const meta = regionGeoMetadata({ ...baseCategory, canonicalUrl: "https://example.com/parent" }, stateRegion);
    expect(meta.alternates?.canonical).toBe(geoRegionUrl("wilderness-therapy", "California-CA"));
  });

  it("indexes by default and noindexes when the index gate excludes the region", () => {
    expect(regionGeoMetadata(baseCategory, stateRegion).robots).toEqual({ index: true, follow: true });
    expect(regionGeoMetadata(baseCategory, stateRegion, { indexable: false }).robots).toEqual({
      index: false,
      follow: true,
    });
  });

  it("keeps the admin robots settings underneath the gate", () => {
    const optedOut = { ...baseCategory, robotsIndex: false, robotsFollow: false };
    expect(regionGeoMetadata(optedOut, stateRegion).robots).toEqual({ index: false, follow: false });
    // Gate can only force index OFF — never back on.
    expect(regionGeoMetadata(optedOut, stateRegion, { indexable: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it("renders region tokens so each region gets a unique title/description", () => {
    const ca = regionGeoMetadata({ ...baseCategory, seoTitle: "Wilderness Therapy {{in region}}" }, stateRegion);
    const sd = regionGeoMetadata({ ...baseCategory, seoTitle: "Wilderness Therapy {{in region}}" }, cityRegion);
    expect(ca.title).toBe("Wilderness Therapy in California");
    expect(sd.title).toBe("Wilderness Therapy in San Diego, CA");
    expect(ca.title).not.toBe(sd.title);
    expect(sd.description).toBe("Programs help girls in San Diego, CA.");
  });

  it("falls back to the default title template when no seoTitle is set", () => {
    const meta = regionGeoMetadata(baseCategory, stateRegion);
    expect(meta.title).toBe("Wilderness Therapy in California");
  });
});

describe("regionPageGeoMetadata", () => {
  it("canonicalizes the numbered pagination URL and suffixes the title", () => {
    const meta = regionPageGeoMetadata(baseCategory, cityRegion, 3);
    expect(meta.title).toBe("Wilderness Therapy in San Diego, CA - Page 3");
    expect(meta.alternates?.canonical).toBe(
      `${geoRegionUrl("wilderness-therapy", "San-Diego-California-CA")}page/3/`,
    );
  });

  it("noindexes pagination pages the gate excludes", () => {
    expect(regionPageGeoMetadata(baseCategory, cityRegion, 2).robots).toEqual({
      index: true,
      follow: true,
    });
    expect(regionPageGeoMetadata(baseCategory, cityRegion, 2, { indexable: false }).robots).toEqual({
      index: false,
      follow: true,
    });
  });
});

describe("parseJsonSchema", () => {
  it("parses a valid object", () => {
    expect(parseJsonSchema('{"@type":"WebPage"}')).toEqual({ "@type": "WebPage" });
  });

  it("returns null for empty, invalid, or non-object JSON", () => {
    expect(parseJsonSchema(null)).toBeNull();
    expect(parseJsonSchema("")).toBeNull();
    expect(parseJsonSchema("{oops")).toBeNull();
    expect(parseJsonSchema('"just a string"')).toBeNull();
    expect(parseJsonSchema("null")).toBeNull();
  });
});

describe("JSON-LD builders", () => {
  it("numbers breadcrumb positions from 1", () => {
    const ld = breadcrumbJsonLd([
      { name: "Home", url: "https://x/" },
      { name: "Cat", url: "https://x/g/cat/" },
    ]) as { itemListElement: Array<{ position: number; name: string }> };
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[0]).toMatchObject({ position: 1, name: "Home" });
    expect(ld.itemListElement[1]).toMatchObject({ position: 2, name: "Cat" });
  });

  it("builds an ItemList with urls", () => {
    const ld = itemListJsonLd("States", "desc", [
      { name: "California", url: "https://x/g/cat/California-CA/" },
    ]) as { itemListElement: Array<{ url: string }> };
    expect(ld.itemListElement[0].url).toBe("https://x/g/cat/California-CA/");
  });

  it("escapes < so script tags cannot break out", () => {
    expect(jsonLdHtml({ evil: "</script>" })).not.toContain("</script>");
    expect(jsonLdHtml({ a: 1 })).toBe('{"a":1}');
  });
});

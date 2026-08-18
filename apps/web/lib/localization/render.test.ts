import { describe, expect, it } from "vitest";
import { renderLocalizedContent, regionTexts, isRegionActive, regionContext } from "./render";

describe("renderLocalizedContent — active region", () => {
  const ctx = regionContext("Sacramento, CA", "Sacramento-California-CA");

  it("substitutes the base region token", () => {
    expect(renderLocalizedContent("Best dentist {{region}}", ctx)).toBe("Best dentist Sacramento, CA");
  });

  it("substitutes all preposition variants", () => {
    const input =
      "Help {{in region}} — {{around region}}, {{near region}}, {{of region}}, {{from region}}, {{in the region area}}, {{from the region area}}";
    expect(renderLocalizedContent(input, ctx)).toBe(
      "Help in Sacramento, CA — around Sacramento, CA, near Sacramento, CA, of Sacramento, CA, from Sacramento, CA, in the Sacramento, CA area, from the Sacramento, CA area",
    );
  });

  it("handles the region URL part token", () => {
    expect(renderLocalizedContent("See {{regionurlpart}}", ctx)).toBe("See Sacramento-California-CA");
  });

  it("splices regionCustom2 via region2inject", () => {
    expect(renderLocalizedContent("Intro {{region2inject}}", { ...ctx, regionCustom2: "<p>Local resources</p>" })).toBe(
      "Intro <p>Local resources</p>",
    );
  });

  it("substitutes category and subcategory tokens", () => {
    const input = "{{catname}} services {{in catname}} with {{subcat}} detail and {{subcattext}} text";
    expect(
      renderLocalizedContent(input, { ...ctx, categoryName: "Dentistry", subcategoryName: "Orthodontics" }),
    ).toBe("Dentistry services in Dentistry with Orthodontics detail and Orthodontics text");
  });

  it("is case-insensitive like the legacy str_ireplace", () => {
    expect(renderLocalizedContent("Help {{IN REGION}} now", ctx)).toBe("Help in Sacramento, CA now");
  });

  it("state-level region name renders correctly", () => {
    expect(renderLocalizedContent("Dentist {{in region}}", regionContext("California"))).toBe(
      "Dentist in California",
    );
  });
});

describe("renderLocalizedContent — no region (ALL pages)", () => {
  it("strips every region token and collapses whitespace", () => {
    const input = "General page {{in region}} and {{around region}} here.";
    expect(renderLocalizedContent(input, regionContext(null))).toBe("General page and here.");
  });

  it("does not mangle category-only content", () => {
    expect(renderLocalizedContent("Plain content, no tokens", regionContext(null))).toBe(
      "Plain content, no tokens",
    );
  });
});

describe("regionTexts / isRegionActive", () => {
  it("builds the full phrase set", () => {
    const t = regionTexts("San Diego, CA");
    expect(t.inRegion).toBe("in San Diego, CA");
    expect(t.inTheRegionArea).toBe("in the San Diego, CA area");
    expect(t.nearRegion).toBe("near San Diego, CA");
  });

  it("detects an active vs inactive region", () => {
    expect(isRegionActive({ regionName: "California" })).toBe(true);
    expect(isRegionActive({ regionName: null })).toBe(false);
    expect(isRegionActive({})).toBe(false);
  });
});
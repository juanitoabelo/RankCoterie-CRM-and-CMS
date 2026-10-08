import { describe, expect, it } from "vitest";
import {
  buildRegionChoices,
  regionLabel,
  resolvePostRegion,
  type PostRegionRow,
} from "./postRegion";

const regions: PostRegionRow[] = [
  { id: "CA", slug: "California-CA", state: "CA", stateFull: "California", city: null, priority: 1 },
  { id: "VA", slug: "Virginia-VA", state: "VA", stateFull: "Virginia", city: null, priority: 1 },
  { id: "CA-SD", slug: "San-Diego-California-CA", state: "CA", stateFull: "California", city: "San Diego", priority: 2 },
  { id: "TX", slug: "Texas-TX", state: "TX", stateFull: "Texas", city: null, priority: 99 },
];

describe("resolvePostRegion", () => {
  it("serves the general (token-stripped) view for ?region=all", () => {
    expect(
      resolvePostRegion({ param: "all", regions, variantRegionIds: ["CA"] }),
    ).toEqual({ kind: "general" });
  });

  it("prefers an explicit valid ?region slug over everything else", () => {
    const resolved = resolvePostRegion({
      param: "San-Diego-California-CA",
      regions,
      variantRegionIds: ["CA"],
      geoState: "TX",
    });
    expect(resolved).toEqual({ kind: "region", region: regions[2] });
  });

  it("falls through to the default when the ?region slug is unknown", () => {
    const resolved = resolvePostRegion({
      param: "Nowhere-XX",
      regions,
      variantRegionIds: ["VA"],
    });
    expect(resolved).toEqual({ kind: "region", region: regions[1] });
  });

  it("uses the geo state (statewide first) when no explicit region is given", () => {
    const resolved = resolvePostRegion({
      regions,
      variantRegionIds: ["VA"],
      geoState: "ca",
    });
    expect(resolved).toEqual({ kind: "region", region: regions[0] });
  });

  it("defaults to the first published variant in region-priority order", () => {
    const resolved = resolvePostRegion({ regions, variantRegionIds: ["TX", "VA"] });
    expect(resolved).toEqual({ kind: "region", region: regions[1] });
  });

  it("serves the general view when the article has no variants", () => {
    expect(resolvePostRegion({ regions, variantRegionIds: [] })).toEqual({
      kind: "general",
    });
  });

  it("ignores geo when the visitor is outside any known state", () => {
    const resolved = resolvePostRegion({
      regions,
      variantRegionIds: ["TX"],
      geoState: "PH",
    });
    expect(resolved).toEqual({ kind: "region", region: regions[3] });
  });
});

describe("buildRegionChoices", () => {
  it("lists All regions plus each variant, marking the active one", () => {
    const resolved = resolvePostRegion({ regions, variantRegionIds: ["CA", "TX"] });
    const choices = buildRegionChoices(regions, ["CA", "TX"], resolved);

    expect(choices).toEqual([
      { slug: "all", label: "All regions", active: false },
      { slug: "California-CA", label: "California", active: true },
      { slug: "Texas-TX", label: "Texas", active: false },
    ]);
  });

  it("marks All regions active for the general view", () => {
    const choices = buildRegionChoices(regions, ["CA"], { kind: "general" });
    expect(choices[0]).toEqual({ slug: "all", label: "All regions", active: true });
  });

  it("appends the active region when it has no variant of its own", () => {
    const choices = buildRegionChoices(regions, ["TX"], {
      kind: "region",
      region: regions[2],
    });
    expect(choices).toEqual([
      { slug: "all", label: "All regions", active: false },
      { slug: "Texas-TX", label: "Texas", active: false },
      { slug: "San-Diego-California-CA", label: "San Diego, CA", active: true },
    ]);
  });
});

describe("regionLabel", () => {
  it("formats cities and states", () => {
    expect(regionLabel(regions[2])).toBe("San Diego, CA");
    expect(regionLabel(regions[0])).toBe("California");
  });
});

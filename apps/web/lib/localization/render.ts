/**
 * Canopy V2 — SEO localization token renderer.
 *
 * Faithful modernization of the legacy engine (canopy-architecture.md §4.2 / §6.5).
 * Content is authored ONCE with natural-language tokens; this renderer substitutes a
 * region (or strips the tokens entirely when no region is active, e.g. "ALL" pages).
 *
 * No I/O, no DB — pure and unit-testable.
 */

export interface RegionContext {
  /** Display name: city "Sacramento, CA" or state "California". */
  regionName?: string | null;
  /** URL slug, e.g. "San-Diego-California-CA". */
  regionUrlPart?: string;
  /** Optional region-authored Custom2 block spliced in via {{region2inject}}. */
  regionCustom2?: string;
  /** Category display name for {{catname}} / {{in catname}}. */
  categoryName?: string;
  /** Subcategory display name for {{subcat}} / {{subcattext}}. */
  subcategoryName?: string;
}

/** Builds the full phrase set for a region display name once. */
export function regionTexts(regionName: string | null | undefined): {
  region: string;
  inRegion: string;
  aroundRegion: string;
  nearRegion: string;
  ofRegion: string;
  fromRegion: string;
  inTheRegionArea: string;
  fromTheRegionArea: string;
} {
  const r = regionName ?? "";
  return {
    region: r,
    inRegion: `in ${r}`,
    aroundRegion: `around ${r}`,
    nearRegion: `near ${r}`,
    ofRegion: `of ${r}`,
    fromRegion: `from ${r}`,
    inTheRegionArea: `in the ${r} area`,
    fromTheRegionArea: `from the ${r} area`,
  };
}

export function isRegionActive(ctx: RegionContext): boolean {
  return !!ctx.regionName && ctx.regionName.length > 0;
}

/**
 * Render localized content for a region context.
 *
 * With an active region  → tokens become natural language:
 *   "help {{in region}}"  →  "help in Sacramento, CA"
 * With NO region (e.g. "ALL" pages) → region tokens are removed and double spaces
 * collapsed, matching the legacy ~region~ strip behaviour.
 */
export function renderLocalizedContent(input: string | null | undefined, ctx: RegionContext): string {
  const out = input ?? "";
  if (!isRegionActive(ctx)) {
    // Strip every token (with a preceding space) and normalize whitespace.
    return out
      .replace(/\{\{\s*[^{}]*\s*\}\}/gi, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const texts = regionTexts(ctx.regionName);
  const t = (inner: string) => new RegExp(`\\{\\{\\s*${inner}\\s*\\}\\}`, "gi");
  const replacements: Array<[RegExp, string]> = [
    [t("in the region area"), texts.inTheRegionArea],
    [t("from the region area"), texts.fromTheRegionArea],
    [t("around region"), texts.aroundRegion],
    [t("in region"), texts.inRegion],
    [t("near region"), texts.nearRegion],
    [t("of region"), texts.ofRegion],
    [t("from region"), texts.fromRegion],
    [t("regionurlpart"), ctx.regionUrlPart ?? ctx.regionName ?? ""],
    [t("region2inject"), ctx.regionCustom2 ?? ""],
    [t("region"), texts.region],
    [t("in catName"), `in ${ctx.categoryName ?? ""}`],
    [t("catName"), ctx.categoryName ?? ""],
    [t("subcattext"), ctx.subcategoryName ?? ""],
    [t("subcat"), ctx.subcategoryName ?? ""],
  ];

  let result = out;
  for (const [re, value] of replacements) {
    result = result.replace(re, value);
  }
  return result.trim();
}

/** Convenience: merge a region display name + slug into a full context. */
export function regionContext(regionName: string | null | undefined, regionUrlPart?: string): RegionContext {
  return { regionName, regionUrlPart };
}
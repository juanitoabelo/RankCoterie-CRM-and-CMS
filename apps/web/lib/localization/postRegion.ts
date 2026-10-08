/**
 * Single-post region resolution (§6.5b public rendering).
 *
 * Priority when serving /{slug}:
 *   1. explicit ?region=<slug>      — highest (user's own choice)
 *   2. ?region=all                  — the token-stripped "original" post
 *   3. geo state (Vercel headers)   — visitor's US state, when available
 *   4. first published variant      — region-priority order (deterministic default)
 *   5. general                      — no variants exist → token-stripped original
 *
 * Unknown ?region slugs fall through instead of rendering raw {{tokens}}.
 * Pure functions only — no I/O — so this is unit-testable.
 */

export interface PostRegionRow {
  id: string;
  slug: string;
  state: string;
  stateFull: string;
  city: string | null;
  priority: number;
}

export type ResolvedPostRegion =
  | { kind: "general" }
  | { kind: "region"; region: PostRegionRow };

export interface RegionChoice {
  slug: string;
  label: string;
  active: boolean;
}

/** Display name: "San Diego, CA" for cities, "California" for states. */
export function regionLabel(r: Pick<PostRegionRow, "city" | "state" | "stateFull">): string {
  return r.city ? `${r.city}, ${r.state}` : r.stateFull;
}

export function resolvePostRegion(opts: {
  param?: string;
  /** ALL region rows, ordered priority asc (same order as the DB queries). */
  regions: PostRegionRow[];
  /** Region IDs that have a LIVE variant for this article. */
  variantRegionIds: string[];
  /** US state code from the request (e.g. "CA"), when geo headers exist. */
  geoState?: string | null;
}): ResolvedPostRegion {
  const { param, regions, variantRegionIds, geoState } = opts;

  if (param === "all") return { kind: "general" };

  if (param) {
    const explicit = regions.find((r) => r.slug === param);
    if (explicit) return { kind: "region", region: explicit };
    // Unknown slug — fall through rather than serving raw tokens.
  }

  if (geoState) {
    const code = geoState.toUpperCase();
    const geo =
      regions.find((r) => r.state === code && r.city === null) ??
      regions.find((r) => r.state === code);
    if (geo) return { kind: "region", region: geo };
  }

  const firstVariant = regions.find((r) => variantRegionIds.includes(r.id));
  if (firstVariant) return { kind: "region", region: firstVariant };

  return { kind: "general" };
}

/**
 * Switcher chips: "All regions" + every published variant region (+ the active
 * region when it has no variant of its own, e.g. a geo match rendered on the fly).
 */
export function buildRegionChoices(
  regions: PostRegionRow[],
  variantRegionIds: string[],
  resolved: ResolvedPostRegion,
): RegionChoice[] {
  const variantRegions = regions.filter((r) => variantRegionIds.includes(r.id));
  const generalActive = resolved.kind === "general";

  const choices: RegionChoice[] = [
    { slug: "all", label: "All regions", active: generalActive },
  ];

  for (const r of variantRegions) {
    choices.push({
      slug: r.slug,
      label: regionLabel(r),
      active: resolved.kind === "region" && resolved.region.id === r.id,
    });
  }

  if (
    resolved.kind === "region" &&
    !variantRegions.some((r) => r.id === resolved.region.id)
  ) {
    choices.push({
      slug: resolved.region.slug,
      label: regionLabel(resolved.region),
      active: true,
    });
  }

  return choices;
}

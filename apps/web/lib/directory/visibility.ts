/**
 * Canopy V2 — directory visibility gate (§6.7, legacy §4.10).
 *
 * THE single enforcement point: suppressed (admin opt-out), unpaid, suspended and
 * expired listings must never render — in category pages, region pages, feeds,
 * topics, search, sitemap or structured data.
 *
 * All query paths (Prisma repo, sitemap.ts, feeds) must filter through
 * `filterVisibleListings` / `isListingVisible`. Pure and unit-testable; the DB layer
 * only ever fetches candidate rows, this module decides what is public.
 */

export type ListingTier = "SUPPRESSED" | "FREE" | "STANDARD" | "PREMIUM";
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "LIVE" | "SUSPENDED" | "EXPIRED";

/** Minimal view of a listing needed for visibility decisions. */
export interface VisibilityListing {
  id: string;
  /** Matches ExcludedCompany.domainKey / companyName rules. */
  domainKey?: string | null;
  companyName?: string | null;
  tier: ListingTier;
  status: ListingStatus;
  /**
   * Legacy migration grace: FREE listings are (temporarily) visible until this
   * date while their owners are re-enrolled into paid tiers.
   */
  freeGraceUntil?: Date | null;
  /** Paid listings stay visible through dunning until this date. */
  paymentGraceUntil?: Date | null;
}

export interface ExclusionRule {
  /** Exact match against listing.domainKey. */
  domainKey?: string;
  /** Case-insensitive substring match against listing.companyName. */
  companyNameContains?: string;
}

export interface VisibilityOptions {
  now?: Date;
  exclusions?: ExclusionRule[];
}

/** True when the listing must not appear anywhere on the public site. */
export function isListingVisible(listing: VisibilityListing, opts: VisibilityOptions = {}): boolean {
  const now = opts.now ?? new Date();

  // 1. Admin opt-out blocklist (§6.7.3.1): always wins.
  if (listing.tier === "SUPPRESSED") return false;
  if (matchesExclusion(listing, opts.exclusions ?? [])) return false;

  // 2. Tier + status rules.
  switch (listing.tier) {
    case "FREE":
      // Only visible through the migration grace window.
      return !!listing.freeGraceUntil && listing.freeGraceUntil.getTime() > now.getTime();
    case "STANDARD":
    case "PREMIUM":
      // Visible while LIVE, or inside the payment-dunning grace window.
      if (listing.status === "LIVE") return true;
      if (listing.status === "SUSPENDED") {
        return !!listing.paymentGraceUntil && listing.paymentGraceUntil.getTime() > now.getTime();
      }
      return false;
    default:
      return false;
  }
}

function matchesExclusion(listing: VisibilityListing, rules: ExclusionRule[]): boolean {
  const domainKey = listing.domainKey?.toLowerCase() ?? "";
  const name = listing.companyName?.toLowerCase() ?? "";
  return rules.some((r) => {
    if (r.domainKey && r.domainKey.toLowerCase() === domainKey) return true;
    if (r.companyNameContains && name.includes(r.companyNameContains.toLowerCase())) return true;
    return false;
  });
}

export function filterVisibleListings<T extends VisibilityListing>(
  listings: T[],
  opts: VisibilityOptions = {},
): T[] {
  return listings.filter((l) => isListingVisible(l, opts));
}
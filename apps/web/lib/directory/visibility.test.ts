import { describe, expect, it } from "vitest";
import { isListingVisible, filterVisibleListings } from "./visibility";
import type { VisibilityListing } from "./visibility";

const now = new Date("2026-01-15T00:00:00Z");
const past = new Date("2026-01-01T00:00:00Z");
const future = new Date("2026-02-01T00:00:00Z");

function listing(overrides: Partial<VisibilityListing>): VisibilityListing {
  return {
    id: "l1",
    domainKey: "clearview-horizon",
    companyName: "Clearview Horizon",
    tier: "STANDARD",
    status: "LIVE",
    ...overrides,
  };
}

describe("isListingVisible", () => {
  it("never shows SUPPRESSED listings (admin opt-out)", () => {
    expect(isListingVisible(listing({ tier: "SUPPRESSED", status: "LIVE" }), { now })).toBe(false);
  });

  it("hides a suppressed listing even with payment", () => {
    expect(
      isListingVisible(listing({ tier: "SUPPRESSED", paymentGraceUntil: future }), { now }),
    ).toBe(false);
  });

  it("applies exclusion rules by domainKey", () => {
    expect(
      isListingVisible(listing({ tier: "PREMIUM", status: "LIVE" }), {
        now,
        exclusions: [{ domainKey: "clearview-horizon" }],
      }),
    ).toBe(false);
  });

  it("applies exclusion rules by company name substring (case-insensitive)", () => {
    expect(
      isListingVisible(listing({ tier: "PREMIUM", status: "LIVE" }), {
        now,
        exclusions: [{ companyNameContains: "CLEARVIEW" }],
      }),
    ).toBe(false);
  });

  it("shows a live paid listing", () => {
    expect(isListingVisible(listing({ tier: "STANDARD", status: "LIVE" }), { now })).toBe(true);
    expect(isListingVisible(listing({ tier: "PREMIUM", status: "LIVE" }), { now })).toBe(true);
  });

  it("hides unpaid non-grace listings", () => {
    expect(isListingVisible(listing({ tier: "FREE" }), { now })).toBe(false);
    expect(isListingVisible(listing({ tier: "STANDARD", status: "DRAFT" }), { now })).toBe(false);
    expect(isListingVisible(listing({ tier: "STANDARD", status: "EXPIRED" }), { now })).toBe(false);
  });

  it("keeps FREE legacy listings visible inside the migration grace window", () => {
    expect(isListingVisible(listing({ tier: "FREE", freeGraceUntil: future }), { now })).toBe(true);
    expect(isListingVisible(listing({ tier: "FREE", freeGraceUntil: past }), { now })).toBe(false);
  });

  it("keeps SUSPENDED listings visible only through the payment grace window (dunning)", () => {
    expect(isListingVisible(listing({ tier: "PREMIUM", status: "SUSPENDED", paymentGraceUntil: future }), { now })).toBe(true);
    expect(isListingVisible(listing({ tier: "PREMIUM", status: "SUSPENDED", paymentGraceUntil: past }), { now })).toBe(false);
  });
});

describe("filterVisibleListings", () => {
  it("filters a mixed set down to the public ones", () => {
    const mixed = [
      listing({ id: "a", tier: "PREMIUM", status: "LIVE" }),
      listing({ id: "b", tier: "SUPPRESSED" }),
      listing({ id: "c", tier: "FREE", freeGraceUntil: future }),
      listing({ id: "d", tier: "FREE", freeGraceUntil: past }),
      listing({ id: "e", tier: "STANDARD", status: "EXPIRED" }),
    ];
    const visible = filterVisibleListings(mixed, { now }).map((l) => l.id);
    expect(visible).toEqual(["a", "c"]);
  });

  it("excludes blocklisted companies from a paid set", () => {
    const paid = [listing({ id: "x", tier: "PREMIUM", status: "LIVE" })];
    expect(
      filterVisibleListings(paid, { now, exclusions: [{ domainKey: "clearview-horizon" }] }),
    ).toEqual([]);
  });
});
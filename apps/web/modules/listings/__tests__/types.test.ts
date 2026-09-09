/**
 * Listings Module — Tests
 */
import { describe, it, expect } from "vitest";
import { STATUS_BADGE, STATUS_FILTERS } from "../types";

describe("STATUS_BADGE", () => {
  it("has badges for all statuses", () => {
    expect(STATUS_BADGE.DRAFT).toBeDefined();
    expect(STATUS_BADGE.PENDING_REVIEW).toBeDefined();
    expect(STATUS_BADGE.LIVE).toBeDefined();
    expect(STATUS_BADGE.SUSPENDED).toBeDefined();
    expect(STATUS_BADGE.EXPIRED).toBeDefined();
  });

  it("uses correct Tailwind classes", () => {
    expect(STATUS_BADGE.LIVE).toContain("emerald");
    expect(STATUS_BADGE.PENDING_REVIEW).toContain("amber");
    expect(STATUS_BADGE.EXPIRED).toContain("red");
  });
});

describe("STATUS_FILTERS", () => {
  it("includes ALL filter", () => {
    expect(STATUS_FILTERS).toContain("ALL");
  });

  it("includes all status values", () => {
    expect(STATUS_FILTERS).toContain("DRAFT");
    expect(STATUS_FILTERS).toContain("PENDING_REVIEW");
    expect(STATUS_FILTERS).toContain("LIVE");
    expect(STATUS_FILTERS).toContain("SUSPENDED");
    expect(STATUS_FILTERS).toContain("EXPIRED");
  });

  it("has 6 filters total", () => {
    expect(STATUS_FILTERS).toHaveLength(6);
  });
});

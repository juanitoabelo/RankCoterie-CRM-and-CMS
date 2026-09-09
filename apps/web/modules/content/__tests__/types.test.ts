/**
 * Content Module — Tests
 */
import { describe, it, expect } from "vitest";
import { CONTENT_STATUS_BADGE, CONTENT_STATUS_FILTERS } from "../types";

describe("CONTENT_STATUS_BADGE", () => {
  it("has badges for all statuses", () => {
    expect(CONTENT_STATUS_BADGE.DRAFT).toBeDefined();
    expect(CONTENT_STATUS_BADGE.PENDING_REVIEW).toBeDefined();
    expect(CONTENT_STATUS_BADGE.LIVE).toBeDefined();
    expect(CONTENT_STATUS_BADGE.ARCHIVED).toBeDefined();
  });

  it("uses correct Tailwind classes", () => {
    expect(CONTENT_STATUS_BADGE.LIVE).toContain("emerald");
    expect(CONTENT_STATUS_BADGE.PENDING_REVIEW).toContain("amber");
    expect(CONTENT_STATUS_BADGE.DRAFT).toContain("zinc");
  });
});

describe("CONTENT_STATUS_FILTERS", () => {
  it("includes ALL filter", () => {
    expect(CONTENT_STATUS_FILTERS).toContain("ALL");
  });

  it("includes all status values", () => {
    expect(CONTENT_STATUS_FILTERS).toContain("DRAFT");
    expect(CONTENT_STATUS_FILTERS).toContain("PENDING_REVIEW");
    expect(CONTENT_STATUS_FILTERS).toContain("LIVE");
    expect(CONTENT_STATUS_FILTERS).toContain("ARCHIVED");
  });

  it("has 5 filters total", () => {
    expect(CONTENT_STATUS_FILTERS).toHaveLength(5);
  });
});

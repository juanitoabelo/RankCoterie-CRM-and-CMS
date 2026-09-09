/**
 * Leads Module — Tests
 */
import { describe, it, expect } from "vitest";
import { LEAD_STATUS_BADGE } from "../types";

describe("LEAD_STATUS_BADGE", () => {
  it("has badges for all statuses", () => {
    expect(LEAD_STATUS_BADGE.NEW).toBeDefined();
    expect(LEAD_STATUS_BADGE.OPEN).toBeDefined();
    expect(LEAD_STATUS_BADGE.CLOSED).toBeDefined();
    expect(LEAD_STATUS_BADGE.ARCHIVED).toBeDefined();
  });

  it("uses correct Tailwind classes", () => {
    expect(LEAD_STATUS_BADGE.NEW).toContain("blue");
    expect(LEAD_STATUS_BADGE.OPEN).toContain("amber");
    expect(LEAD_STATUS_BADGE.CLOSED).toContain("emerald");
    expect(LEAD_STATUS_BADGE.ARCHIVED).toContain("zinc");
  });
});

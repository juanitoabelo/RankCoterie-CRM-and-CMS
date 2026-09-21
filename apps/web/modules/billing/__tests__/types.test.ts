/**
 * Billing Module — Tests
 */
import { describe, it, expect } from "vitest";
import { INVOICE_STATUS_BADGE } from "../types";

describe("INVOICE_STATUS_BADGE", () => {
  it("has badges for all statuses", () => {
    expect(INVOICE_STATUS_BADGE.ATTEMPTED).toBeDefined();
    expect(INVOICE_STATUS_BADGE.APPROVED).toBeDefined();
    expect(INVOICE_STATUS_BADGE.DECLINED).toBeDefined();
    expect(INVOICE_STATUS_BADGE.ERROR).toBeDefined();
    expect(INVOICE_STATUS_BADGE.REFUNDED).toBeDefined();
    expect(INVOICE_STATUS_BADGE.CHARGEDBACK).toBeDefined();
  });

  it("uses correct Tailwind classes", () => {
    expect(INVOICE_STATUS_BADGE.APPROVED).toContain("emerald");
    expect(INVOICE_STATUS_BADGE.DECLINED).toContain("red");
    expect(INVOICE_STATUS_BADGE.REFUNDED).toContain("sky");
    expect(INVOICE_STATUS_BADGE.CHARGEDBACK).toContain("purple");
  });
});

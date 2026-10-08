import { describe, expect, it } from "vitest";
import {
  churnRate,
  computeMrr,
  groupInvoicesByMonth,
  monthKey,
  monthlyPriceForTier,
  newSubscriptions,
  normalizeMonthlyAmount,
  parseTierAmount,
  recentMonthKeys,
  renewalValue,
  summarizeSubscriptions,
  totalInvoices,
  upcomingRenewals,
  type InvoiceLike,
  type ListingSubLike,
} from "./listing-revenue";

const amounts = { STANDARD: 97, PREMIUM: 197 };
const NOW = new Date("2026-03-15T12:00:00.000Z");

function sub(over: Partial<ListingSubLike> = {}): ListingSubLike {
  return {
    tier: "STANDARD",
    status: "LIVE",
    createdAt: "2026-01-01T00:00:00.000Z",
    currentPeriodEnd: "2026-06-01T00:00:00.000Z",
    canceledAt: null,
    stripeSubId: "sub_1",
    ...over,
  };
}

describe("parseTierAmount", () => {
  it("parses plain, formatted and currency strings", () => {
    expect(parseTierAmount("97")).toBe(97);
    expect(parseTierAmount("$197.50")).toBe(197.5);
    expect(parseTierAmount(42)).toBe(42);
  });
  it("defaults invalid/negative to 0", () => {
    expect(parseTierAmount("")).toBe(0);
    expect(parseTierAmount("abc")).toBe(0);
    expect(parseTierAmount("-5")).toBe(0);
    expect(parseTierAmount(null)).toBe(0);
  });
});

describe("monthlyPriceForTier", () => {
  it("maps STANDARD/PREMIUM and zeroes FREE/SUPPRESSED", () => {
    expect(monthlyPriceForTier("STANDARD", amounts)).toBe(97);
    expect(monthlyPriceForTier("PREMIUM", amounts)).toBe(197);
    expect(monthlyPriceForTier("FREE", amounts)).toBe(0);
    expect(monthlyPriceForTier("SUPPRESSED", amounts)).toBe(0);
  });
});

describe("normalizeMonthlyAmount", () => {
  it("normalizes yearly/quarterly/weekly/daily to monthly", () => {
    expect(normalizeMonthlyAmount(1200, "year")).toBeCloseTo(100);
    expect(normalizeMonthlyAmount(300, "month", 3)).toBeCloseTo(100);
    expect(normalizeMonthlyAmount(12, "week")).toBeCloseTo(52);
    expect(normalizeMonthlyAmount(10, "day")).toBeCloseTo(304.166, 2);
  });
  it("treats month/default/null as-is", () => {
    expect(normalizeMonthlyAmount(97, "month")).toBe(97);
    expect(normalizeMonthlyAmount(97, null)).toBe(97);
    expect(normalizeMonthlyAmount(97, undefined)).toBe(97);
  });
});

describe("summarizeSubscriptions", () => {
  it("counts by status and tier", () => {
    const s = summarizeSubscriptions([
      sub(),
      sub({ status: "SUSPENDED" }),
      sub({ status: "EXPIRED" }),
      sub({ tier: "PREMIUM" }),
    ]);
    expect(s.total).toBe(4);
    expect(s.active).toBe(2);
    expect(s.suspended).toBe(1);
    expect(s.expired).toBe(1);
    expect(s.inGrace).toBe(1);
    expect(s.byTier).toEqual({ STANDARD: 3, PREMIUM: 1 });
  });
});

describe("computeMrr", () => {
  it("sums configured price for LIVE subs only", () => {
    expect(
      computeMrr([sub(), sub({ tier: "PREMIUM" }), sub({ status: "EXPIRED", tier: "PREMIUM" })], amounts),
    ).toBe(294);
  });
});

describe("upcomingRenewals / renewalValue", () => {
  it("returns renewals within the window, soonest first", () => {
    const renewals = upcomingRenewals(
      [
        sub({ currentPeriodEnd: "2026-04-01T00:00:00.000Z" }),
        sub({ tier: "PREMIUM", currentPeriodEnd: "2026-03-20T00:00:00.000Z" }),
        sub({ currentPeriodEnd: "2026-06-01T00:00:00.000Z" }), // outside 30d
        sub({ status: "EXPIRED", currentPeriodEnd: "2026-03-20T00:00:00.000Z" }), // not live
      ],
      30,
      NOW,
    );
    expect(renewals).toHaveLength(2);
    expect(renewals[0].tier).toBe("PREMIUM");
    expect(renewals[0].daysUntil).toBe(5);
    expect(renewalValue(amounts, renewals)).toBe(294);
  });
});

describe("churnRate", () => {
  it("is 0 when nothing was canceled", () => {
    expect(churnRate([sub(), sub()], 30, NOW)).toBe(0);
  });
  it("counts cancellations inside the window", () => {
    const rate = churnRate(
      [
        sub(),
        sub({ status: "EXPIRED", canceledAt: "2026-03-10T00:00:00.000Z" }),
        sub({ status: "EXPIRED", canceledAt: "2025-01-01T00:00:00.000Z" }), // outside
      ],
      30,
      NOW,
    );
    expect(rate).toBeCloseTo((1 / 2) * 100);
  });
});

describe("newSubscriptions", () => {
  it("counts subs created within the window", () => {
    expect(
      newSubscriptions(
        [sub({ createdAt: "2026-03-10T00:00:00.000Z" }), sub({ createdAt: "2025-01-01T00:00:00.000Z" })],
        30,
        NOW,
      ),
    ).toBe(1);
  });
});

describe("month buckets", () => {
  it("builds trailing UTC month keys", () => {
    expect(recentMonthKeys(3, NOW)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(monthKey(new Date("2026-09-30T23:00:00Z"))).toBe("2026-09");
  });
});

describe("groupInvoicesByMonth", () => {
  it("buckets collected/refunded per month, filling gaps", () => {
    const invoices: InvoiceLike[] = [
      { amountPaid: 9700, created: Date.UTC(2026, 2, 2) / 1000, status: "paid", subscriptionId: "sub_1" },
      { amountPaid: 19700, amountRefunded: 5000, created: Date.UTC(2026, 2, 20) / 1000, status: "paid", subscriptionId: "sub_1" },
      { amountPaid: 9700, created: Date.UTC(2026, 0, 5) / 1000, status: "paid", subscriptionId: "sub_1" },
      { amountPaid: 9700, created: Date.UTC(2025, 5, 1) / 1000, status: "paid", subscriptionId: "sub_1" }, // outside 3mo
    ];
    const flows = groupInvoicesByMonth(invoices, 3, NOW);
    expect(flows.map((f) => f.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(flows[0]).toMatchObject({ collected: 97, net: 97, paidCount: 1 });
    expect(flows[1]).toMatchObject({ collected: 0, net: 0 });
    expect(flows[2].collected).toBeCloseTo(294);
    expect(flows[2].refunded).toBeCloseTo(50);
    expect(flows[2].net).toBeCloseTo(244);
    expect(flows[2].paidCount).toBe(2);
  });
});

describe("totalInvoices", () => {
  it("sums collected, refunds and failure/paid counts", () => {
    const t = totalInvoices([
      { amountPaid: 9700, created: 0, status: "paid", subscriptionId: "s" },
      { amountPaid: 19700, amountRefunded: 9700, created: 0, status: "paid", subscriptionId: "s" },
      { amountPaid: 0, created: 0, status: "open", subscriptionId: "s" },
    ]);
    expect(t.collected).toBe(294);
    expect(t.refunded).toBe(97);
    expect(t.net).toBe(197);
    expect(t.paidInvoices).toBe(2);
    expect(t.failedInvoices).toBe(1);
  });
});

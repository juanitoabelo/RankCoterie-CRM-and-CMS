import { describe, expect, it } from "vitest";
import { FORECAST_ATTRIBUTION_DIMENSIONS } from "../constants";
import {
  buildAttribution,
  buildAttributionByDimension,
  buildForecast,
  buildHistoricalTrend,
  buildLifecycleFunnel,
  buildStageFunnel,
  buildStageTransitions,
  buildWinRate,
  resolveAttributionKey,
  type ForecastDeal,
} from "../forecasting";

const now = new Date("2026-11-18T12:00:00Z");

function deal(overrides: Partial<ForecastDeal> = {}): ForecastDeal {
  return {
    id: "deal-1",
    title: "Deal 1",
    value: 10000,
    probability: null,
    stageProbability: 50,
    isWon: false,
    isLost: false,
    expectedCloseDate: new Date("2026-11-20T12:00:00Z"),
    wonAt: null,
    createdAt: new Date("2026-10-01T12:00:00Z"),
    closedAt: null,
    source: "website",
    campaignId: null,
    publisherId: null,
    subId: null,
    clickId: null,
    landingPageId: null,
    rawLeadSource: null,
    ownerId: "user-1",
    ownerLabel: "Ada",
    stageId: "stage-new",
    stageKey: "new",
    leadId: null,
    clientId: null,
    ...overrides,
  };
}

describe("CRM forecasting", () => {
  it("weights open deals by probability and adds closed-won actuals", () => {
    const result = buildForecast(
      [
        deal(),
        deal({
          id: "deal-2",
          value: 8000,
          probability: 25,
          expectedCloseDate: new Date("2026-12-10T12:00:00Z"),
        }),
        deal({
          id: "deal-3",
          value: 4000,
          isWon: true,
          wonAt: new Date("2026-11-05T12:00:00Z"),
        }),
        deal({
          id: "deal-4",
          value: 9999,
          isLost: true,
          expectedCloseDate: new Date("2026-11-21T12:00:00Z"),
        }),
      ],
      { months: 3, now },
    );

    const november = result.months.find((month) => month.key === "2026-11");
    const december = result.months.find((month) => month.key === "2026-12");
    expect(november).toMatchObject({ openCount: 1, openValue: 10000, wonValue: 4000, weighted: 9000 });
    expect(december).toMatchObject({ openCount: 1, openValue: 8000, weighted: 2000 });
    expect(result.totals).toMatchObject({ openValue: 18000, wonValue: 4000, weighted: 11000 });
    expect(result.bestCase).toBe(22000);
    expect(result.worstCase).toBe(4000);
  });

  it("builds source and owner attribution with decided-only win rates and shares", () => {
    const result = buildAttribution([
      deal(),
      deal({ id: "deal-2", value: 10000, isWon: true, wonAt: new Date("2026-11-01T12:00:00Z") }),
      deal({ id: "deal-3", value: 10000, source: "referral", ownerId: "user-2", ownerLabel: "Grace" }),
    ]);

    expect(result.bySource[0]).toMatchObject({
      key: "website",
      count: 2,
      value: 20000,
      wonCount: 1,
      lostCount: 0,
      openCount: 1,
      wonValue: 10000,
      winRate: 100,
      share: 66.67,
    });
    expect(result.byOwner).toHaveLength(2);
    expect(result.byOwner[0].label).toBe("Ada");
  });

  it("computes decided-only win rate and average sales cycle", () => {
    const result = buildWinRate([
      deal({
        isWon: true,
        createdAt: new Date("2026-11-01T00:00:00Z"),
        wonAt: new Date("2026-11-10T00:00:00Z"),
        closedAt: new Date("2026-11-10T00:00:00Z"),
      }),
      deal({
        id: "deal-2",
        isLost: true,
        createdAt: new Date("2026-10-19T00:00:00Z"),
        closedAt: new Date("2026-11-03T00:00:00Z"),
      }),
      deal({ id: "deal-3" }),
    ]);

    expect(result).toMatchObject({
      wonCount: 1,
      lostCount: 1,
      decidedCount: 2,
      openCount: 1,
      winRate: 50,
      avgSalesCycleDays: 12,
    });
  });

  it("builds an ordered stage funnel and ignores unknown stages", () => {
    const stages = [
      { id: "stage-new", key: "new", label: "New", order: 10 },
      { id: "stage-won", key: "won", label: "Won", order: 50, isWon: true },
      { id: "stage-lost", key: "lost", label: "Lost", order: 60, isLost: true },
    ];
    const rows = buildStageFunnel(
      [
        deal({ value: 100 }),
        deal({ id: "deal-2", value: 50 }),
        deal({ id: "deal-3", stageId: "stage-won", stageKey: "won", value: 200, isWon: true }),
        deal({ id: "deal-4", stageId: "stage-unknown", value: 999 }),
      ],
      stages,
    );

    expect(rows).toEqual([
      { key: "new", label: "New", count: 2, value: 150, order: 10, isWon: false, isLost: false },
      { key: "won", label: "Won", count: 1, value: 200, order: 50, isWon: true, isLost: false },
      { key: "lost", label: "Lost", count: 0, value: 0, order: 60, isWon: false, isLost: true },
    ]);
  });

  it("builds a lead-to-client-to-deal lifecycle funnel", () => {
    const rows = buildLifecycleFunnel([
      deal({ leadId: "lead-1", value: 100 }),
      deal({ id: "deal-2", clientId: "client-1", value: 200 }),
      deal({
        id: "deal-3",
        leadId: "lead-2",
        clientId: "client-2",
        value: 300,
        isWon: true,
        wonAt: new Date("2026-11-02T00:00:00Z"),
      }),
    ]);

    expect(rows).toEqual([
      { key: "leads", label: "Leads", count: 2, value: 400 },
      { key: "clients", label: "Clients", count: 2, value: 500 },
      { key: "deals", label: "Deals", count: 3, value: 600 },
      { key: "won", label: "Won", count: 1, value: 300 },
    ]);
  });

  it("builds a 12-month historical trend ending in the current month", () => {
    const rows = buildHistoricalTrend(
      [
        deal({ createdAt: new Date("2026-11-02T00:00:00Z"), value: 100 }),
        deal({
          id: "deal-2",
          createdAt: new Date("2026-10-05T00:00:00Z"),
          isWon: true,
          wonAt: new Date("2026-11-03T00:00:00Z"),
          closedAt: new Date("2026-11-03T00:00:00Z"),
          value: 200,
        }),
        deal({
          id: "deal-3",
          createdAt: new Date("2026-01-04T00:00:00Z"),
          isLost: true,
          closedAt: new Date("2026-01-20T00:00:00Z"),
          value: 300,
        }),
      ],
      { now },
    );

    expect(rows).toHaveLength(12);
    expect(rows[0].key).toBe("2025-12");
    expect(rows[11].key).toBe("2026-11");
    expect(rows.find((row) => row.key === "2026-11")).toMatchObject({
      createdCount: 1,
      createdValue: 100,
      wonCount: 1,
      wonValue: 200,
      closedCount: 1,
      closedValue: 200,
    });
    expect(rows.find((row) => row.key === "2026-01")).toMatchObject({
      createdCount: 1,
      createdValue: 300,
      wonCount: 0,
      wonValue: 0,
      closedCount: 1,
      closedValue: 300,
    });
  });

  it("resolves attribution keys from the static config with source precedence", () => {
    const attributed = deal({
      source: "website",
      rawLeadSource: "FB",
      campaignId: "cmp-1",
      publisherId: "pub-1",
      subId: "sub-1",
      clickId: "clk-1",
      landingPageId: "lp-1",
    });

    expect(FORECAST_ATTRIBUTION_DIMENSIONS.campaign.label).toBe("Campaign");
    expect(resolveAttributionKey(attributed, "source")).toBe("facebook");
    expect(resolveAttributionKey(attributed, "campaign")).toBe("cmp-1");
    expect(resolveAttributionKey(attributed, "landingPage")).toBe("lp-1");
    expect(resolveAttributionKey(deal({ source: null, rawLeadSource: null }), "source")).toBe("—");
  });

  it("groups attribution by a configured dimension with decided-only rates", () => {
    const rows = buildAttributionByDimension(
      [
        deal({ campaignId: "cmp-1", source: "website" }),
        deal({ id: "deal-2", campaignId: "cmp-1", isWon: true, wonAt: now }),
        deal({ id: "deal-3", campaignId: "cmp-1", isLost: true, closedAt: now }),
      ],
      "campaign",
    );

    expect(rows[0]).toMatchObject({
      key: "cmp-1",
      label: "cmp-1",
      count: 3,
      wonCount: 1,
      lostCount: 1,
      openCount: 1,
      winRate: 50,
    });
  });

  it("parses stage transitions from activity metadata and ignores malformed rows", () => {
    const transitions = buildStageTransitions([
      { metadata: { from: "new", to: "won" } },
      { metadata: { from: "new", to: "won" } },
      { metadata: { from: "qualified", to: "lost" } },
      { metadata: null },
      { metadata: { from: "new" } },
      { metadata: { from: 1, to: "won" } },
      { metadata: ["new", "won"] },
    ]);

    expect(transitions).toEqual([
      { from: "new", to: "won", count: 2 },
      { from: "qualified", to: "lost", count: 1 },
    ]);
  });
});

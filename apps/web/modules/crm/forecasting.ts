import {
  FORECAST_ATTRIBUTION_ALIASES,
  FORECAST_ATTRIBUTION_DIMENSIONS,
  FORECAST_ATTRIBUTION_LABELS,
  type ForecastAttributionDimension,
} from "./constants";

export type ForecastDeal = {
  id: string;
  title: string;
  value: number;
  probability: number | null;
  stageProbability: number;
  isWon: boolean;
  isLost: boolean;
  expectedCloseDate: Date | null;
  wonAt: Date | null;
  createdAt: Date;
  closedAt: Date | null;
  source?: string | null;
  campaignId?: string | null;
  publisherId?: string | null;
  subId?: string | null;
  clickId?: string | null;
  landingPageId?: string | null;
  rawLeadSource?: string | null;
  ownerId?: string | null;
  ownerLabel?: string | null;
  stageId: string;
  stageKey?: string | null;
  leadId?: string | null;
  clientId?: string | null;
};

export type ForecastMonth = {
  key: string;
  label: string;
  openCount: number;
  openValue: number;
  wonCount: number;
  wonValue: number;
  weighted: number;
};

export type AttributionRow = {
  key: string;
  label: string;
  count: number;
  value: number;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  openCount: number;
  winRate: number;
  share: number;
};

export type WinRateSummary = {
  wonCount: number;
  lostCount: number;
  decidedCount: number;
  openCount: number;
  winRate: number;
  avgSalesCycleDays: number;
};

export type StageFunnelRow = {
  key: string;
  label: string;
  count: number;
  value: number;
  order: number;
  isWon: boolean;
  isLost: boolean;
};

export type LifecycleFunnelRow = {
  key: string;
  label: string;
  count: number;
  value: number;
};

export type HistoricalTrendPoint = {
  key: string;
  label: string;
  createdCount: number;
  createdValue: number;
  wonCount: number;
  wonValue: number;
  closedCount: number;
  closedValue: number;
};

export type StageTransition = {
  from: string;
  to: string;
  count: number;
};

export type StageDefinition = {
  id?: string;
  key?: string | null;
  label: string;
  order?: number;
  isWon?: boolean;
  isLost?: boolean;
};

const EMPTY_ATTRIBUTION_VALUE = "—";
const DAY_MS = 24 * 60 * 60 * 1000;

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function monthDate(offset: number, now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}

export function buildForecast(
  deals: ForecastDeal[],
  options: { months?: number; now?: Date } = {},
): { months: ForecastMonth[]; totals: { openValue: number; wonValue: number; weighted: number }; bestCase: number; worstCase: number } {
  const months = Math.max(1, Math.min(24, options.months ?? 6));
  const now = options.now ?? new Date();
  const buckets = new Map<string, ForecastMonth>();

  for (let offset = 0; offset < months; offset += 1) {
    const date = monthDate(offset, now);
    const key = monthKey(date);
    buckets.set(key, {
      key,
      label: monthLabel(date),
      openCount: 0,
      openValue: 0,
      wonCount: 0,
      wonValue: 0,
      weighted: 0,
    });
  }

  let totalOpenValue = 0;
  let totalWonValue = 0;

  for (const deal of deals) {
    if (deal.isLost) continue;
    const date = deal.isWon ? deal.wonAt : deal.expectedCloseDate;
    if (!date) continue;
    const bucket = buckets.get(monthKey(date));
    if (!bucket) continue;

    if (deal.isWon) {
      bucket.wonCount += 1;
      bucket.wonValue += deal.value;
      bucket.weighted += deal.value;
      totalWonValue += deal.value;
      continue;
    }

    const probability = Math.max(
      0,
      Math.min(100, deal.probability ?? deal.stageProbability),
    );
    bucket.openCount += 1;
    bucket.openValue += deal.value;
    bucket.weighted += deal.value * (probability / 100);
    totalOpenValue += deal.value;
  }

  const weighted = [...buckets.values()].reduce((sum, bucket) => sum + bucket.weighted, 0);
  return {
    months: [...buckets.values()],
    totals: {
      openValue: round(totalOpenValue),
      wonValue: round(totalWonValue),
      weighted: round(weighted),
    },
    bestCase: round(totalOpenValue + totalWonValue),
    worstCase: round(totalWonValue),
  };
}

export function buildWinRate(deals: ForecastDeal[]): WinRateSummary {
  let wonCount = 0;
  let lostCount = 0;
  let openCount = 0;
  let totalDays = 0;
  let cycleCount = 0;

  for (const deal of deals) {
    if (!deal.isWon && !deal.isLost) {
      openCount += 1;
      continue;
    }
    const end = deal.isWon ? deal.wonAt ?? deal.closedAt : deal.closedAt;
    if (deal.isWon) wonCount += 1;
    else lostCount += 1;
    if (end && deal.createdAt) {
      const days = (end.getTime() - deal.createdAt.getTime()) / DAY_MS;
      if (Number.isFinite(days) && days >= 0) {
        totalDays += days;
        cycleCount += 1;
      }
    }
  }

  const decidedCount = wonCount + lostCount;
  return {
    wonCount,
    lostCount,
    decidedCount,
    openCount,
    winRate: decidedCount ? round((wonCount / decidedCount) * 100) : 0,
    avgSalesCycleDays: cycleCount ? round(totalDays / cycleCount, 1) : 0,
  };
}

export function buildStageFunnel(
  deals: ForecastDeal[],
  stages: StageDefinition[],
): StageFunnelRow[] {
  const totals = new Map<string, { count: number; value: number }>();
  for (const deal of deals) {
    const row = totals.get(deal.stageId) ?? { count: 0, value: 0 };
    row.count += 1;
    row.value += deal.value;
    totals.set(deal.stageId, row);
  }

  return stages
    .map((stage) => {
      const total = totals.get(stage.id ?? "") ?? { count: 0, value: 0 };
      return {
        key: stage.key || stage.id || stage.label,
        label: stage.label,
        count: total.count,
        value: round(total.value),
        order: stage.order ?? 0,
        isWon: Boolean(stage.isWon),
        isLost: Boolean(stage.isLost),
      };
    })
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function buildLifecycleFunnel(deals: ForecastDeal[]): LifecycleFunnelRow[] {
  const leadIds = new Set<string>();
  const clientIds = new Set<string>();
  let leadValue = 0;
  let clientValue = 0;
  let dealValue = 0;
  let wonValue = 0;
  let wonCount = 0;

  for (const deal of deals) {
    dealValue += deal.value;
    if (deal.leadId && !leadIds.has(deal.leadId)) {
      leadIds.add(deal.leadId);
      leadValue += deal.value;
    }
    if (deal.clientId && !clientIds.has(deal.clientId)) {
      clientIds.add(deal.clientId);
      clientValue += deal.value;
    }
    if (deal.isWon) {
      wonCount += 1;
      wonValue += deal.value;
    }
  }

  return [
    { key: "leads", label: "Leads", count: leadIds.size, value: round(leadValue) },
    { key: "clients", label: "Clients", count: clientIds.size, value: round(clientValue) },
    { key: "deals", label: "Deals", count: deals.length, value: round(dealValue) },
    { key: "won", label: "Won", count: wonCount, value: round(wonValue) },
  ];
}

export function buildHistoricalTrend(
  deals: ForecastDeal[],
  options: { months?: number; now?: Date } = {},
): HistoricalTrendPoint[] {
  const months = Math.max(1, Math.min(24, options.months ?? 12));
  const now = options.now ?? new Date();
  const buckets = new Map<string, HistoricalTrendPoint>();

  for (let offset = 0; offset < months; offset += 1) {
    const date = monthDate(offset - (months - 1), now);
    const key = monthKey(date);
    buckets.set(key, {
      key,
      label: monthLabel(date),
      createdCount: 0,
      createdValue: 0,
      wonCount: 0,
      wonValue: 0,
      closedCount: 0,
      closedValue: 0,
    });
  }

  const add = (date: Date | null | undefined, prefix: "created" | "won" | "closed", value: number) => {
    if (!date) return;
    const bucket = buckets.get(monthKey(date));
    if (!bucket) return;
    bucket[`${prefix}Count`] += 1;
    bucket[`${prefix}Value`] += value;
  };

  for (const deal of deals) {
    add(deal.createdAt, "created", deal.value);
    if (deal.isWon) add(deal.wonAt, "won", deal.value);
    if (deal.isWon || deal.isLost) add(deal.closedAt ?? (deal.isWon ? deal.wonAt : null), "closed", deal.value);
  }

  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    createdValue: round(bucket.createdValue),
    wonValue: round(bucket.wonValue),
    closedValue: round(bucket.closedValue),
  }));
}

export function resolveAttributionKey(
  deal: ForecastDeal,
  dimension: ForecastAttributionDimension,
): string {
  const config = FORECAST_ATTRIBUTION_DIMENSIONS[dimension];
  for (const field of config.fields) {
    const value = deal[field];
    if (typeof value !== "string" || !value.trim()) continue;
    const raw = value.trim();
    return FORECAST_ATTRIBUTION_ALIASES[raw.toLowerCase()] ?? raw;
  }
  return EMPTY_ATTRIBUTION_VALUE;
}

export function attributionLabel(key: string): string {
  return FORECAST_ATTRIBUTION_LABELS[key.toLowerCase()] ?? key;
}

function groupAttribution(
  deals: ForecastDeal[],
  keyOf: (deal: ForecastDeal) => string,
  labelOf: (key: string, deal: ForecastDeal) => string,
  totalValue: number,
): AttributionRow[] {
  const groups = new Map<string, AttributionRow>();
  for (const deal of deals) {
    const key = keyOf(deal);
    const row = groups.get(key) ?? {
      key,
      label: labelOf(key, deal),
      count: 0,
      value: 0,
      wonCount: 0,
      wonValue: 0,
      lostCount: 0,
      openCount: 0,
      winRate: 0,
      share: 0,
    };
    row.count += 1;
    row.value += deal.value;
    if (deal.isWon) {
      row.wonCount += 1;
      row.wonValue += deal.value;
    } else if (deal.isLost) {
      row.lostCount += 1;
    } else {
      row.openCount += 1;
    }
    groups.set(key, row);
  }
  return [...groups.values()]
    .map((row) => {
      const decided = row.wonCount + row.lostCount;
      return {
        ...row,
        value: round(row.value),
        wonValue: round(row.wonValue),
        winRate: decided ? round((row.wonCount / decided) * 100) : 0,
        share: totalValue ? round((row.value / totalValue) * 100) : 0,
      };
    })
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

export function buildAttributionByDimension(
  deals: ForecastDeal[],
  dimension: ForecastAttributionDimension,
  totalValue = deals.reduce((sum, deal) => sum + deal.value, 0),
): AttributionRow[] {
  return groupAttribution(
    deals,
    (deal) => resolveAttributionKey(deal, dimension),
    (key) => attributionLabel(key),
    totalValue,
  );
}

export function buildAttribution(deals: ForecastDeal[]): {
  bySource: AttributionRow[];
  byOwner: AttributionRow[];
  byCampaign: AttributionRow[];
  byPublisher: AttributionRow[];
  byLandingPage: AttributionRow[];
  totalValue: number;
} {
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  return {
    bySource: buildAttributionByDimension(deals, "source", totalValue),
    byOwner: groupAttribution(
      deals,
      (deal) => deal.ownerId || "unassigned",
      (key, deal) => (key === "unassigned" ? "Unassigned" : deal.ownerLabel || key),
      totalValue,
    ),
    byCampaign: buildAttributionByDimension(deals, "campaign", totalValue),
    byPublisher: buildAttributionByDimension(deals, "publisher", totalValue),
    byLandingPage: buildAttributionByDimension(deals, "landingPage", totalValue),
    totalValue: round(totalValue),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function buildStageTransitions(
  activities: { metadata: unknown }[],
): StageTransition[] {
  const counts = new Map<string, StageTransition>();
  for (const activity of activities) {
    if (!isRecord(activity.metadata)) continue;
    const { from, to } = activity.metadata;
    if (typeof from !== "string" || typeof to !== "string") continue;
    const fromKey = from.trim();
    const toKey = to.trim();
    if (!fromKey || !toKey) continue;
    const key = `${fromKey}\u0000${toKey}`;
    const row = counts.get(key) ?? { from: fromKey, to: toKey, count: 0 };
    row.count += 1;
    counts.set(key, row);
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.from.localeCompare(b.from) || a.to.localeCompare(b.to),
  );
}

/**
 * Canopy V2 — Listing subscription revenue report helpers (§6.7.3.2).
 *
 * Pure functions only (no Prisma/Stripe imports) so the report maths are
 * unit-testable. The report mixes two sources:
 *   - Local DB  → lifecycle counts, tier mix, MRR estimate, renewals, churn.
 *   - Live Stripe → actual money in (paid invoices) and out (refunds).
 */

export type TierAmountMap = { STANDARD: number; PREMIUM: number };

/** Minimal shape of a listing subscription row needed for reporting. */
export type ListingSubLike = {
  id?: string;
  tier: string;
  status: string;
  createdAt: Date | string;
  currentPeriodEnd: Date | string | null;
  canceledAt: Date | string | null;
  stripeSubId: string | null;
};

/** Minimal shape of a Stripe invoice needed for reporting. */
export type InvoiceLike = {
  id?: string;
  /** Amount actually collected, in minor units (cents). */
  amountPaid: number;
  /** Amount refunded, in minor units (cents). */
  amountRefunded?: number;
  /** Unix timestamp of invoice creation. */
  created: number;
  status: string;
  subscriptionId: string | null;
};

export const MS_PER_DAY = 86_400_000;

/** Parse a configured tier amount ("97", "$97", "97.50") into a number. */
export function parseTierAmount(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Monthly price for a tier from the admin-configured amount map. */
export function monthlyPriceForTier(tier: string, amounts: TierAmountMap): number {
  if (tier === "STANDARD") return amounts.STANDARD;
  if (tier === "PREMIUM") return amounts.PREMIUM;
  return 0;
}

/**
 * Normalize a recurring price to a monthly amount.
 * `interval` is a Stripe recurring interval: day | week | month | year.
 */
export function normalizeMonthlyAmount(
  amount: number,
  interval: string | null | undefined,
  intervalCount: number | null | undefined = 1,
): number {
  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;
  switch (interval) {
    case "year":
      return (amount / 12) * (1 / count);
    case "week":
      return (amount * (52 / 12)) * (1 / count);
    case "day":
      return (amount * (365 / 12)) * (1 / count);
    case "month":
    case null:
    case undefined:
    default:
      return amount / count;
  }
}

export type SubscriptionSummary = {
  total: number;
  byStatus: Record<string, number>;
  byTier: Record<string, number>;
  active: number;
  suspended: number;
  expired: number;
  inGrace: number;
  trial: number;
};

/** Count subscriptions by lifecycle status/tier. */
export function summarizeSubscriptions(subs: ListingSubLike[]): SubscriptionSummary {
  const byStatus: Record<string, number> = {};
  const byTier: Record<string, number> = {};
  for (const s of subs) {
    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    byTier[s.tier] = (byTier[s.tier] ?? 0) + 1;
  }
  return {
    total: subs.length,
    byStatus,
    byTier,
    active: byStatus.LIVE ?? 0,
    suspended: byStatus.SUSPENDED ?? 0,
    expired: byStatus.EXPIRED ?? 0,
    // Dunning grace is reflected by the subscription row still being visible.
    inGrace: byStatus.SUSPENDED ?? 0,
    trial: 0,
  };
}

/** Estimated MRR from live (paid) subscriptions, using configured tier prices. */
export function computeMrr(subs: ListingSubLike[], amounts: TierAmountMap): number {
  return subs
    .filter((s) => s.status === "LIVE")
    .reduce((sum, s) => sum + monthlyPriceForTier(s.tier, amounts), 0);
}

export type Renewal = {
  id?: string;
  tier: string;
  currentPeriodEnd: string;
  daysUntil: number;
};

/** Subscriptions renewing within `withinDays` (default 30), soonest first. */
export function upcomingRenewals(
  subs: ListingSubLike[],
  withinDays = 30,
  now: Date = new Date(),
): Renewal[] {
  const horizon = now.getTime() + withinDays * MS_PER_DAY;
  const out: Renewal[] = [];
  for (const s of subs) {
    if (s.status !== "LIVE" || !s.currentPeriodEnd) continue;
    const end = new Date(s.currentPeriodEnd);
    const ts = end.getTime();
    if (!Number.isFinite(ts) || ts < now.getTime() || ts > horizon) continue;
    out.push({
      id: s.id,
      tier: s.tier,
      currentPeriodEnd: end.toISOString(),
      daysUntil: Math.ceil((ts - now.getTime()) / MS_PER_DAY),
    });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Upcoming renewal value in currency units, using configured tier prices. */
export function renewalValue(amounts: TierAmountMap, renewals: Renewal[]): number {
  return renewals.reduce((sum, r) => sum + monthlyPriceForTier(r.tier, amounts), 0);
}

/** Churn = subs canceled within the window ÷ subs active at window start. */
export function churnRate(
  subs: ListingSubLike[],
  windowDays = 30,
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  const activeNow = subs.filter((s) => s.status === "LIVE").length;
  const canceled = subs.filter(
    (s) => s.canceledAt && new Date(s.canceledAt).getTime() >= cutoff,
  ).length;
  const atStart = activeNow + canceled;
  return atStart > 0 ? (canceled / atStart) * 100 : 0;
}

/** New subscriptions created within the window. */
export function newSubscriptions(
  subs: ListingSubLike[],
  windowDays = 30,
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  return subs.filter((s) => new Date(s.createdAt).getTime() >= cutoff).length;
}

export type MonthlyFlow = {
  /** YYYY-MM (UTC). */
  month: string;
  /** Collected this month, in currency units. */
  collected: number;
  /** Refunded this month, in currency units. */
  refunded: number;
  /** Collected minus refunded. */
  net: number;
  /** Number of paid invoices. */
  paidCount: number;
};

/** UTC month key, e.g. "2026-03". */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** The last `months` UTC month keys ending at `now` (oldest first). */
export function recentMonthKeys(months: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }
  return keys;
}

/**
 * Group paid invoices into per-month collected/refunded totals.
 * `months` controls how many trailing buckets are returned (empty months filled).
 */
export function groupInvoicesByMonth(
  invoices: InvoiceLike[],
  months = 12,
  now: Date = new Date(),
): MonthlyFlow[] {
  const keys = recentMonthKeys(months, now);
  const index = new Map(keys.map((k, i) => [k, i]));
  const flows: MonthlyFlow[] = keys.map((month) => ({
    month,
    collected: 0,
    refunded: 0,
    net: 0,
    paidCount: 0,
  }));

  for (const inv of invoices) {
    const key = monthKey(new Date(inv.created * 1000));
    const i = index.get(key);
    if (i === undefined) continue;
    const collected = (inv.amountPaid ?? 0) / 100;
    const refunded = (inv.amountRefunded ?? 0) / 100;
    flows[i].collected += collected;
    flows[i].refunded += refunded;
    flows[i].paidCount += inv.status === "paid" ? 1 : 0;
  }
  for (const f of flows) {
    f.net = f.collected - f.refunded;
  }
  return flows;
}

export type CollectedTotals = {
  collected: number;
  refunded: number;
  net: number;
  paidInvoices: number;
  failedInvoices: number;
};

/** Totals across a set of invoices (already scoped to listing subscriptions). */
export function totalInvoices(invoices: InvoiceLike[]): CollectedTotals {
  let collected = 0;
  let refunded = 0;
  let paidInvoices = 0;
  let failedInvoices = 0;
  for (const inv of invoices) {
    collected += (inv.amountPaid ?? 0) / 100;
    refunded += (inv.amountRefunded ?? 0) / 100;
    if (inv.status === "paid") paidInvoices += 1;
    if (inv.status === "open" || inv.status === "uncollectible" || inv.status === "void") {
      failedInvoices += 1;
    }
  }
  return {
    collected,
    refunded,
    net: collected - refunded,
    paidInvoices,
    failedInvoices,
  };
}

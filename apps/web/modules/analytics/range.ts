import type { AnalyticsRange } from "./types";

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function parseDays(value: string | number | undefined | null, fallback = 30): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(365, Math.max(1, Math.round(parsed)));
}

export function resolveAnalyticsRange(daysInput?: string | number | null): AnalyticsRange {
  const days = parseDays(daysInput);
  const now = new Date();
  const to = startOfUtcDay(addDays(now, 1));
  const from = startOfUtcDay(addDays(now, -(days - 1)));
  const previousTo = from;
  const previousFrom = addDays(from, -days);
  return { days, from, to, previousFrom, previousTo };
}

export function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

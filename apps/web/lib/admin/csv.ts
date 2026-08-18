/**
 * Canopy V2 — CSV export helper (reports page + /api/admin/exports).
 *
 * Pure and deliberately tiny: RFC-4180-style quoting for the values that
 * matter (commas, quotes, newlines), no dependency.
 */

export interface CsvColumn<T> {
  key: string;
  label: string;
  /** value extractor; defaults to String(row[key] ?? "") */
  value?: (row: T) => string;
}

function escapeCell(raw: string): string {
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(c.value ? c.value(row) : String((row as Record<string, unknown>)[c.key] ?? ""))).join(","),
  );
  return [header, ...body].join("\r\n") + "\r\n";
}

export function toIsoCell(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

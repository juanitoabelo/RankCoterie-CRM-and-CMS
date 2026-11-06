/**
 * Rank Coterie — CSV helpers (reports page, /api/admin/exports, admin imports).
 *
 * Pure and deliberately tiny: RFC-4180-style quoting for the values that
 * matter (commas, quotes, newlines), no dependency — plus a matching parser.
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

/**
 * RFC-4180 parser. Returns every row (including blank lines) as cells;
 * row 0 is the header when the file has one. Handles CRLF/LF, quoted cells
 * with embedded commas/newlines, doubled quotes, and a UTF-8 BOM.
 */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let cellTouched = false; // any content (incl. an empty "") seen for this cell

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && !cellTouched) {
      inQuotes = true;
      cellTouched = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      cellTouched = false;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      cellTouched = false;
      continue;
    }
    cell += ch;
    cellTouched = true;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

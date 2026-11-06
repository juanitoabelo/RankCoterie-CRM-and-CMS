/**
 * Rank Coterie — XLSX → cell matrix for admin bulk imports.
 *
 * exceljs is loaded dynamically so it stays out of client bundles and only
 * pays its cost when an .xlsx upload actually arrives. Row positions are
 * preserved (gaps stay empty) so "sheet row" numbers in validation errors
 * match what the user sees in Excel.
 */

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.richText)) {
      return (v.richText as { text?: string }[]).map((t) => t.text ?? "").join("");
    }
    if (typeof v.text === "string") return v.text; // hyperlink cells
    if ("result" in v) return cellToString(v.result); // formula cells
    if (typeof v.error === "string") return ""; // error cells (#N/A …)
  }
  return String(value);
}

export async function xlsxToMatrix(buffer: Buffer): Promise<string[][]> {
  const mod = await import("exceljs");
  // CJS interop: webpack may surface the exports as default or flat named.
  const ExcelJS: typeof mod = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const workbook = new ExcelJS.Workbook();
  // exceljs's d.ts declares its own Buffer shape; cast once at the boundary.
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const byRow = new Map<number, string[]>();
  let lastContentRow = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values as unknown[];
    const cells = values.slice(1).map(cellToString); // exceljs values are 1-based
    if (cells.some((c) => c.trim() !== "")) lastContentRow = rowNumber;
    byRow.set(rowNumber, cells);
  });

  const matrix: string[][] = [];
  for (let n = 1; n <= lastContentRow; n++) {
    matrix.push(byRow.get(n) ?? []);
  }
  return matrix;
}

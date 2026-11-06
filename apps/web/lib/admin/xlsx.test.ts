import { describe, it, expect } from "vitest";
import * as ExcelJS from "exceljs";
import { xlsxToMatrix } from "./xlsx";

async function workbookToBuffer(
  fill: (sheet: ExcelJS.Worksheet) => void,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Sheet1");
  fill(sheet);
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}

describe("xlsxToMatrix", () => {
  it("reads the first worksheet as a string matrix", async () => {
    const buffer = await workbookToBuffer((sheet) => {
      sheet.addRow(["Title", "Slug", "Status"]);
      sheet.addRow(["Austin", "austin-tx", "LIVE"]);
      sheet.addRow(["Dallas", "dallas-tx", "DRAFT"]);
    });
    const matrix = await xlsxToMatrix(buffer);
    expect(matrix).toEqual([
      ["Title", "Slug", "Status"],
      ["Austin", "austin-tx", "LIVE"],
      ["Dallas", "dallas-tx", "DRAFT"],
    ]);
  });

  it("preserves row positions across blank rows", async () => {
    const buffer = await workbookToBuffer((sheet) => {
      sheet.addRow(["Title"]);
      sheet.addRow(["Keep"]);
      sheet.addRow([]); // explicit empty row
      sheet.addRow(["Later"]);
    });
    const matrix = await xlsxToMatrix(buffer);
    expect(matrix).toHaveLength(4);
    expect(matrix[1]).toEqual(["Keep"]);
    expect(matrix[2]).toEqual([]);
    expect(matrix[3]).toEqual(["Later"]);
  });

  it("coerces numbers and dates to strings", async () => {
    const buffer = await workbookToBuffer((sheet) => {
      sheet.addRow(["Title", "Slug"]);
      sheet.addRow([123, new Date("2026-01-15T12:00:00Z")]);
    });
    const matrix = await xlsxToMatrix(buffer);
    expect(matrix[1][0]).toBe("123");
    expect(matrix[1][1]).toBe("2026-01-15");
  });

  it("returns [] for an empty workbook", async () => {
    const buffer = await workbookToBuffer(() => {});
    expect(await xlsxToMatrix(buffer)).toEqual([]);
  });
});

import { describe, it, expect } from "vitest";
import { toCsv, toIsoCell } from "./csv";

describe("toCsv", () => {
  const cols = [
    { key: "name", label: "Name" },
    { key: "note", label: "Note" },
    { key: "age", label: "Age" },
  ];

  it("emits header + rows with CRLF", () => {
    const csv = toCsv([{ name: "Jane", note: "ok", age: 30 }], cols);
    expect(csv).toBe('Name,Note,Age\r\nJane,ok,30\r\n');
  });

  it("quotes cells containing commas, quotes, or newlines", () => {
    const csv = toCsv(
      [{ name: 'Smith, John', note: 'said "hi"\nnext line', age: 0 }],
      cols,
    );
    expect(csv).toContain('"Smith, John"');
    expect(csv).toContain('"said ""hi""\nnext line"');
  });

  it("treats null/missing as empty and uses custom value extractors", () => {
    const csv = toCsv(
      [{ name: null, note: "x", age: 1 }],
      [{ ...cols[0], value: (r: { name: string | null }) => r.name ?? "N/A" }, cols[1], cols[2]],
    );
    expect(csv).toBe('Name,Note,Age\r\nN/A,x,1\r\n');
  });

  it("handles empty row sets (header only)", () => {
    expect(toCsv([], cols)).toBe("Name,Note,Age\r\n");
  });
});

describe("toIsoCell", () => {
  it("formats dates as YYYY-MM-DD", () => {
    expect(toIsoCell(new Date("2024-08-12T10:00:00Z"))).toBe("2024-08-12");
  });
  it("returns empty string for null/undefined", () => {
    expect(toIsoCell(null)).toBe("");
    expect(toIsoCell(undefined)).toBe("");
  });
});
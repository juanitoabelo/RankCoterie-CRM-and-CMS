import { describe, expect, it } from "vitest";
import {
  BLOCK_DEFINITIONS,
  COLUMN_SPANS,
  createBlock,
  createRowLayout,
  isRowBlock,
  type RowBlock,
} from "./types";

describe("createBlock — row", () => {
  it("defaults stackOnMobile to true", () => {
    const row = createBlock("row") as RowBlock;
    expect(row.props.stackOnMobile).toBe(true);
  });

  it("includes gap, align, and two 6-span columns", () => {
    const row = createBlock("row") as RowBlock;
    expect(row.props.gap).toBe(24);
    expect(row.props.align).toBe("stretch");
    expect(row.props.columns).toHaveLength(2);
    expect(row.props.columns.every((c) => c.span === 6)).toBe(true);
  });
});

describe("createRowLayout", () => {
  it("defaults stackOnMobile to true", () => {
    const row = createRowLayout("two-halves");
    expect(row.props.stackOnMobile).toBe(true);
  });

  it("creates columns matching the layout spans", () => {
    const row = createRowLayout("three");
    expect(row.props.columns.map((c) => c.span)).toEqual([4, 4, 4]);
  });

  it("falls back to two 6-span columns for unknown layout", () => {
    const row = createRowLayout("nonexistent");
    expect(row.props.columns.map((c) => c.span)).toEqual([6, 6]);
  });
});

describe("BLOCK_DEFINITIONS — row", () => {
  it("row definition includes stackOnMobile in defaults", () => {
    const rowDef = BLOCK_DEFINITIONS.find((d) => d.type === "row")!;
    expect((rowDef.defaults as RowBlock["props"]).stackOnMobile).toBe(true);
  });
});

describe("isRowBlock", () => {
  it("returns true for row blocks", () => {
    expect(isRowBlock(createBlock("row"))).toBe(true);
  });

  it("returns false for non-row blocks", () => {
    expect(isRowBlock(createBlock("text"))).toBe(false);
    expect(isRowBlock(createBlock("hero"))).toBe(false);
  });
});

describe("COLUMN_SPANS", () => {
  it("contains valid span values", () => {
    expect(COLUMN_SPANS).toEqual([3, 4, 6, 8, 12]);
  });
});

import { describe, expect, it } from "vitest";
import {
  canvasColumnSpanClass,
  renderColumnSpanClass,
  resolveColumnWidths,
  type ColumnWidths,
} from "./spans";
import { createBlock, type RowBlock } from "./types";

describe("resolveColumnWidths", () => {
  it("stacks to full width on mobile by default (stackOnMobile)", () => {
    const row = createBlock("row") as RowBlock;
    const col = row.props.columns[0];
    expect(resolveColumnWidths(col, true)).toEqual({ mobile: 12, tablet: 6, desktop: 6 });
  });

  it("keeps the desktop width on every breakpoint when stackOnMobile is false", () => {
    const col = { span: 4, spanMd: undefined, spanSm: undefined };
    expect(resolveColumnWidths(col, false)).toEqual({ mobile: 4, tablet: 4, desktop: 4 });
  });

  it("honours explicit per-breakpoint spans", () => {
    const col = { span: 6, spanMd: 8, spanSm: 12 };
    expect(resolveColumnWidths(col, true)).toEqual({ mobile: 12, tablet: 8, desktop: 6 });
    expect(resolveColumnWidths(col, false)).toEqual({ mobile: 12, tablet: 8, desktop: 6 });
  });

  it("falls back to the desktop span on tablet and mobile when unset", () => {
    const col = { span: 9, spanMd: undefined, spanSm: undefined };
    expect(resolveColumnWidths(col, true)).toEqual({ mobile: 12, tablet: 9, desktop: 9 });
  });

  it("clamps out-of-range values to the 1–12 grid", () => {
    const col = { span: 0, spanMd: -3, spanSm: 99 };
    const w = resolveColumnWidths(col, false);
    expect(w.desktop).toBeGreaterThanOrEqual(1);
    expect(w.desktop).toBeLessThanOrEqual(12);
    expect(w.tablet).toBe(1);
    expect(w.mobile).toBe(12);
  });

  it("falls back to a default span for missing values", () => {
    expect(resolveColumnWidths({}, false)).toEqual({ mobile: 6, tablet: 6, desktop: 6 });
  });
});

describe("renderColumnSpanClass", () => {
  it("builds the three-breakpoint responsive classes", () => {
    const widths: ColumnWidths = { mobile: 12, tablet: 8, desktop: 6 };
    expect(renderColumnSpanClass(widths)).toBe(
      "col-span-12 md:col-span-8 lg:col-span-6",
    );
  });

  it("uses the same class when all breakpoints match", () => {
    const widths: ColumnWidths = { mobile: 4, tablet: 4, desktop: 4 };
    expect(renderColumnSpanClass(widths)).toBe(
      "col-span-4 md:col-span-4 lg:col-span-4",
    );
  });

  it("covers the full 1–12 grid per breakpoint", () => {
    for (let s = 1; s <= 12; s += 1) {
      const cls = renderColumnSpanClass({ mobile: s, tablet: s, desktop: s });
      expect(cls).toContain(`col-span-${s}`);
      expect(cls).toContain(`md:col-span-${s}`);
      expect(cls).toContain(`lg:col-span-${s}`);
    }
  });
});

describe("canvasColumnSpanClass", () => {
  const widths: ColumnWidths = { mobile: 12, tablet: 8, desktop: 6 };

  it("resolves the active viewport width", () => {
    expect(canvasColumnSpanClass(widths, "mobile")).toBe("col-span-12");
    expect(canvasColumnSpanClass(widths, "tablet")).toBe("col-span-8");
    expect(canvasColumnSpanClass(widths, "desktop")).toBe("col-span-6");
  });

  it("matches Elementor-style 6/8/12 across devices", () => {
    expect(canvasColumnSpanClass(widths, "desktop")).toBe("col-span-6");
    expect(canvasColumnSpanClass(widths, "tablet")).toBe("col-span-8");
    expect(canvasColumnSpanClass(widths, "mobile")).toBe("col-span-12");
  });

  it("a default 6/12 row column stacks to col-span-12 on the mobile canvas", () => {
    const row = createBlock("row") as RowBlock;
    const col = row.props.columns[0];
    const w = resolveColumnWidths(col, row.props.stackOnMobile !== false);
    expect(canvasColumnSpanClass(w, "desktop")).toBe("col-span-6");
    expect(canvasColumnSpanClass(w, "mobile")).toBe("col-span-12");
  });

  it("a 9/12 main+sidebar column without mobile span stacks on the mobile canvas", () => {
    const w = resolveColumnWidths({ span: 9, blocks: [] }, true);
    expect(canvasColumnSpanClass(w, "desktop")).toBe("col-span-9");
    expect(canvasColumnSpanClass(w, "mobile")).toBe("col-span-12");
  });
});
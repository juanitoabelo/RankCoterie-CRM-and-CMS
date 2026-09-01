import { describe, expect, it } from "vitest";
import { canvasColumnSpanClass, renderColumnSpanClass } from "./spans";

describe("renderColumnSpanClass", () => {
  it("returns col-span-12 + md responsive class when stackOnMobile is true", () => {
    expect(renderColumnSpanClass(6, true)).toBe("col-span-12 md:col-span-6");
    expect(renderColumnSpanClass(4, true)).toBe("col-span-12 md:col-span-4");
    expect(renderColumnSpanClass(12, true)).toBe("col-span-12 md:col-span-12");
  });

  it("returns fixed span class (no responsive prefix) when stackOnMobile is false", () => {
    expect(renderColumnSpanClass(6, false)).toBe("col-span-6");
    expect(renderColumnSpanClass(3, false)).toBe("col-span-3");
    expect(renderColumnSpanClass(12, false)).toBe("col-span-12");
  });

  it("falls back to md:col-span-6 / col-span-6 for out-of-range spans", () => {
    expect(renderColumnSpanClass(0, true)).toBe("col-span-12 md:col-span-6");
    expect(renderColumnSpanClass(0, false)).toBe("col-span-6");
    expect(renderColumnSpanClass(13, true)).toBe("col-span-12 md:col-span-6");
  });
});

describe("canvasColumnSpanClass", () => {
  it("returns col-span-12 on mobile viewport when stackOnMobile is true", () => {
    expect(canvasColumnSpanClass(6, "mobile", true)).toBe("col-span-12");
    expect(canvasColumnSpanClass(4, "mobile", true)).toBe("col-span-12");
  });

  it("returns responsive class on desktop viewport even with stackOnMobile", () => {
    expect(canvasColumnSpanClass(6, "desktop", true)).toBe("md:col-span-6");
    expect(canvasColumnSpanClass(4, "desktop", true)).toBe("md:col-span-4");
  });

  it("returns responsive class on tablet viewport even with stackOnMobile", () => {
    expect(canvasColumnSpanClass(6, "tablet", true)).toBe("md:col-span-6");
  });

  it("returns responsive class on mobile viewport when stackOnMobile is false", () => {
    expect(canvasColumnSpanClass(6, "mobile", false)).toBe("md:col-span-6");
  });

  it("falls back to col-span-12 for unmapped spans", () => {
    expect(canvasColumnSpanClass(7, "desktop", true)).toBe("col-span-12");
    expect(canvasColumnSpanClass(5, "desktop", false)).toBe("col-span-12");
  });

  it("covers all defined span values", () => {
    for (const span of [3, 4, 6, 8, 9, 12]) {
      const cls = canvasColumnSpanClass(span, "desktop", true);
      expect(cls).toContain(`md:col-span-${span}`);
    }
  });
});

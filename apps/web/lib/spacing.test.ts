import { describe, it, expect } from "vitest";
import {
  SPACING_UNITS,
  detectSpacingUnit,
  formatSpacingSide,
  parseSpacingSide,
  retuneSpacing,
  setSpacingSide,
  spacingSideNumber,
  spacingSideToCss,
  spacingToCssParts,
  spacingSideWithFallback,
} from "./spacing";

describe("spacingSideToCss", () => {
  it("treats a bare number as px", () => {
    expect(spacingSideToCss(10)).toBe("10px");
  });

  it("collapses 0 so the key is omitted rather than fighting a Tailwind default", () => {
    expect(spacingSideToCss(0)).toBeUndefined();
  });

  it("passes a unit string through untouched", () => {
    expect(spacingSideToCss("10%")).toBe("10%");
    expect(spacingSideToCss("1.5em")).toBe("1.5em");
  });

  it("keeps an explicit string zero so the unit is not lost", () => {
    expect(spacingSideToCss("0%")).toBe("0%");
  });

  it("omits empty, null and undefined", () => {
    expect(spacingSideToCss("")).toBeUndefined();
    expect(spacingSideToCss(null)).toBeUndefined();
    expect(spacingSideToCss(undefined)).toBeUndefined();
  });

  it("is the single conversion point for the page-builder helper", () => {
    // Mirrors renderHelpers.spacingToCss, which now delegates here.
    expect(spacingSideToCss(24)).toBe("24px");
    expect(spacingSideToCss(0)).toBeUndefined();
    expect(spacingSideToCss("3rem")).toBe("3rem");
  });
});

describe("spacingToCssParts", () => {
  it("converts each side independently", () => {
    expect(spacingToCssParts({ top: 10, right: "5%", bottom: 0, left: "2em" })).toEqual({
      top: "10px",
      right: "5%",
      bottom: undefined,
      left: "2em",
    });
  });

  it("tolerates absent and nullish groups", () => {
    expect(spacingToCssParts(undefined)).toEqual({
      top: undefined,
      right: undefined,
      bottom: undefined,
      left: undefined,
    });
    expect(spacingToCssParts(null)).toEqual({
      top: undefined,
      right: undefined,
      bottom: undefined,
      left: undefined,
    });
  });
});

describe("parseSpacingSide", () => {
  it("splits a unit string into number and unit", () => {
    expect(parseSpacingSide("10%")).toEqual({ value: 10, unit: "%" });
    expect(parseSpacingSide("1.5em")).toEqual({ value: 1.5, unit: "em" });
    expect(parseSpacingSide("-4px")).toEqual({ value: -4, unit: "px" });
  });

  it("reads a bare number as px", () => {
    expect(parseSpacingSide(12)).toEqual({ value: 12, unit: "px" });
  });

  it("is case and whitespace insensitive", () => {
    expect(parseSpacingSide(" 8PX ")).toEqual({ value: 8, unit: "px" });
  });

  it("falls back rather than throwing on junk, so hand-edited data still renders", () => {
    expect(parseSpacingSide("abc")).toEqual({ value: 0, unit: "px" });
    expect(parseSpacingSide("abc", "em")).toEqual({ value: 0, unit: "em" });
    expect(parseSpacingSide(undefined, "%")).toEqual({ value: 0, unit: "%" });
  });

  it("keeps the number from an unknown unit instead of discarding the side", () => {
    expect(parseSpacingSide("10rem")).toEqual({ value: 10, unit: "px" });
    expect(parseSpacingSide("10rem", "em")).toEqual({ value: 10, unit: "em" });
  });

  it("rejects non-finite numbers", () => {
    expect(parseSpacingSide(Number.NaN)).toEqual({ value: 0, unit: "px" });
  });
});

describe("spacingSideNumber", () => {
  it("gives a numeric input the bare number from a unit string", () => {
    expect(spacingSideNumber("10%")).toBe(10);
    expect(spacingSideNumber(10)).toBe(10);
    expect(spacingSideNumber(undefined)).toBe(0);
  });
});

describe("formatSpacingSide", () => {
  it("keeps px as a bare number so legacy rows keep their shape", () => {
    expect(formatSpacingSide(10, "px")).toBe(10);
  });

  it("writes non-px units as strings", () => {
    expect(formatSpacingSide(10, "%")).toBe("10%");
    expect(formatSpacingSide(1.5, "em")).toBe("1.5em");
  });

  it("still writes a string zero for non-px so the choice stays detectable", () => {
    expect(formatSpacingSide(0, "%")).toBe("0%");
  });

  it("round-trips through parse", () => {
    for (const u of SPACING_UNITS) {
      expect(parseSpacingSide(formatSpacingSide(7, u)).value).toBe(7);
    }
  });
});

describe("detectSpacingUnit", () => {
  it("defaults to px when nothing carries a unit", () => {
    expect(detectSpacingUnit({ top: 10, right: 20 })).toBe("px");
    expect(detectSpacingUnit(undefined)).toBe("px");
  });

  it("finds the first explicit non-px unit", () => {
    expect(detectSpacingUnit({ top: 10, right: "5%" })).toBe("%");
    expect(detectSpacingUnit({ top: "2em", right: "5%" })).toBe("em");
  });

  it("ignores a bare number when a later side has a unit", () => {
    expect(detectSpacingUnit({ top: 10, bottom: "3%" })).toBe("%");
  });

  it("respects the fallback for unrecognised data", () => {
    expect(detectSpacingUnit({ top: 10 }, "em")).toBe("em");
  });
});

describe("retuneSpacing", () => {
  it("rewrites every side in the new unit, preserving numbers", () => {
    expect(retuneSpacing({ top: 10, right: 20, bottom: 30, left: 40 }, "%")).toEqual({
      top: "10%",
      right: "20%",
      bottom: "30%",
      left: "40%",
    });
  });

  it("converts between unit strings", () => {
    expect(retuneSpacing({ top: "10%", right: "20%", bottom: "30%", left: "40%" }, "em")).toEqual({
      top: "10em",
      right: "20em",
      bottom: "30em",
      left: "40em",
    });
  });

  it("fills missing sides with 0", () => {
    expect(retuneSpacing({ top: 10 }, "%")).toEqual({
      top: "10%",
      right: "0%",
      bottom: "0%",
      left: "0%",
    });
  });

  it("round-trips back to bare px numbers", () => {
    expect(retuneSpacing({ top: "10%", right: "20%", bottom: "30%", left: "40%" }, "px")).toEqual({
      top: 10,
      right: 20,
      bottom: 30,
      left: 40,
    });
  });

  it("keeps the chosen unit detectable on an all-zero group", () => {
    // Otherwise the dropdown would snap back to px on the next render.
    const retuned = retuneSpacing(undefined, "%");
    expect(detectSpacingUnit(retuned)).toBe("%");
  });
});

describe("setSpacingSide", () => {
  it("applies to all four sides when linked", () => {
    expect(setSpacingSide({ top: 1, right: 2, bottom: 3, left: 4 }, "top", 9, true)).toEqual({
      top: 9,
      right: 9,
      bottom: 9,
      left: 9,
    });
  });

  it("touches one side when unlinked, leaving the others alone", () => {
    expect(setSpacingSide({ top: 1, right: 2, bottom: 3, left: 4 }, "right", 9, false)).toEqual({
      top: 1,
      right: 9,
      bottom: 3,
      left: 4,
    });
  });

  it("does not drop the unit on the first keystroke when linked", () => {
    // The bug the handoff flagged: a linked edit rebuilt a fresh object and
    // silently downgraded "10%" to a bare 10, which renders as px.
    const next = setSpacingSide({ top: "10%", right: "10%", bottom: "10%", left: "10%" }, "top", 5, true);
    expect(next).toEqual({ top: "5%", right: "5%", bottom: "5%", left: "5%" });
  });

  it("does not drop the unit on the first keystroke when unlinked", () => {
    const next = setSpacingSide({ top: "10%", right: 20, bottom: 0, left: 0 }, "top", 5, false);
    expect(next.top).toBe("5%");
  });

  it("preserves each unlinked side's own unit", () => {
    const next = setSpacingSide({ top: "10%", right: "2em", bottom: 0, left: 5 }, "top", 1, false);
    expect(next).toEqual({ top: "1%", right: "2em", bottom: 0, left: 5 });
  });

  it("keeps px as bare numbers", () => {
    expect(setSpacingSide({ top: 10, right: 10, bottom: 10, left: 10 }, "top", 7, true)).toEqual({
      top: 7,
      right: 7,
      bottom: 7,
      left: 7,
    });
  });

  it("defaults missing sides to 0 when unlinked", () => {
    expect(setSpacingSide(undefined, "top", 5, false)).toEqual({
      top: 5,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });
});

describe("legacy round-trip", () => {
  it("renders pre-existing number rows exactly as before", () => {
    const stored = { top: 10, right: 20, bottom: 30, left: 40 };
    expect(spacingToCssParts(stored)).toEqual({
      top: "10px",
      right: "20px",
      bottom: "30px",
      left: "40px",
    });
  });

  it("a unitless legacy value still means px after a unit switch and switch back", () => {
    const original = { top: 10, right: 20, bottom: 30, left: 40 };
    expect(retuneSpacing(retuneSpacing(original, "em"), "px")).toEqual(original);
  });
});

describe("spacingSideWithFallback", () => {
  it("uses the legacy flat prop when the per-side value is absent", () => {
    // Pre-per-side rows only ever stored paddingY.
    expect(spacingSideWithFallback(undefined, 20)).toBe("20px");
    expect(spacingSideWithFallback(null, 20)).toBe("20px");
  });

  it("prefers a per-side value that carries a unit", () => {
    expect(spacingSideWithFallback("10%", 20)).toBe("10%");
  });

  it("treats a stored 0 as authoritative rather than falling through", () => {
    // A plain `??` chain gets this wrong: 0 collapses to no declaration, so
    // the legacy number would win and the explicit zero would be lost.
    expect(spacingSideWithFallback(0, 20)).toBeUndefined();
    expect(spacingSideWithFallback("0%", 20)).toBe("0%");
  });

  it("returns undefined when neither side is set", () => {
    expect(spacingSideWithFallback(undefined, undefined)).toBeUndefined();
  });
});

/**
 * The full SectionEditor Margin flow: switch the unit dropdown, then type a
 * number, and check the CSS the renderer would actually emit.
 */
describe("editor flow", () => {
  it("carries a chosen % through to CSS and keeps the dropdown on %", () => {
    const legacy = { top: 20, right: 10, bottom: 20, left: 10 };

    // User switches the unit dropdown to %.
    const asPct = retuneSpacing(legacy, "%");
    expect(asPct).toEqual({ top: "20%", right: "10%", bottom: "20%", left: "10%" });
    expect(detectSpacingUnit(asPct)).toBe("%");

    // User then types 5 into an unlinked top field.
    const edited = setSpacingSide(asPct, "top", 5, false);
    expect(edited).toEqual({ top: "5%", right: "10%", bottom: "20%", left: "10%" });
    expect(detectSpacingUnit(edited)).toBe("%");

    // This is what HeaderFooterRenderer now puts in the style object.
    expect(spacingToCssParts(edited)).toEqual({
      top: "5%",
      right: "10%",
      bottom: "20%",
      left: "10%",
    });
  });

  it("leaves an untouched legacy group rendering as px", () => {
    expect(spacingToCssParts({ top: 20, right: 10, bottom: 20, left: 10 })).toEqual({
      top: "20px",
      right: "10px",
      bottom: "20px",
      left: "10px",
    });
  });
});

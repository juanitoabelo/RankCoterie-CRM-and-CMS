import { describe, expect, it } from "vitest";
import {
  renderStyleGuide,
  styleScopeClass,
  STYLE_BREAKPOINTS,
  FONT_FAMILY_PRESETS,
} from "./style";
import type { StyleBreakpoints } from "./types";

describe("renderStyleGuide", () => {
  it("returns empty when no style is set", () => {
    expect(renderStyleGuide("abc", undefined)).toBe("");
  });

  it("scopes rules to a sanitized block class", () => {
    const css = renderStyleGuide("id-with--_:spaces", {
      mobile: { color: "#111111" },
    });
    expect(css).toContain(".pb-id-with--_spaces");
  });

  it("emits mobile color as the base for every size", () => {
    const css = renderStyleGuide("b1", { mobile: { color: "#111111" } });
    expect(css).toContain(".pb-b1, .pb-b1 * { color: #111111 !important; }");
    expect(css).not.toContain("@media");
  });

  it("emits larger breakpoints as media-query overrides at their own widths", () => {
    const css = renderStyleGuide("b2", {
      sm: { fontSize: 20 },
      md: { fontSize: 24 },
    });
    expect(css).toContain("@media (min-width: 640px) { .pb-b2, .pb-b2 * { font-size: 20px; } }");
    expect(css).toContain("@media (min-width: 768px) { .pb-b2, .pb-b2 * { font-size: 24px; } }");
  });

  it("keeps mobile as the base that larger breakpoints override", () => {
    const css = renderStyleGuide("b3", {
      mobile: { fontSize: 16 },
      lg: { fontSize: 32 },
    });
    expect(css).toContain(".pb-b3, .pb-b3 * { font-size: 16px; }");
    expect(css).toContain("@media (min-width: 1024px) { .pb-b3, .pb-b3 * { font-size: 32px; } }");
  });

  it("drops unused breakpoints", () => {
    const css = renderStyleGuide("b4", { md: { color: "#000000" } });
    expect(css).not.toContain("min-width: 640px");
    expect(css).not.toContain("min-width: 1024px");
    expect(css).toContain("@media (min-width: 768px)");
  });
});

describe("styleScopeClass", () => {
  it("strips characters unsafe for CSS class names", () => {
    expect(styleScopeClass("a/b.c d")).toBe("pb-abcd");
  });
});

describe("STYLE_BREAKPOINTS / FONT_FAMILY_PRESETS", () => {
  it("exposes a mobile-first breakpoint order", () => {
    expect(STYLE_BREAKPOINTS[0].key).toBe("mobile");
    expect(STYLE_BREAKPOINTS[0].minWidth).toBe(0);
    expect(STYLE_BREAKPOINTS.map((b) => b.key)).toEqual(["mobile", "sm", "md", "lg"]);
  });

  it("has font-family presets with real CSS stacks", () => {
    const sans = FONT_FAMILY_PRESETS.find((p) => p.key === "sans");
    expect(sans?.value).toContain("sans-serif");
  });
});

describe("StyleBreakpoints with contentGrid / slider use-case", () => {
  it("types a typical style guide object", () => {
    const style: StyleBreakpoints = {
      mobile: { color: "#111111", fontSize: 16 },
      md: { fontFamily: FONT_FAMILY_PRESETS[0].value },
      lg: { color: "#000000", fontSize: 22 },
    };
    expect(style.mobile?.fontSize).toBe(16);
    expect(style.md?.fontFamily).toBeDefined();
  });
});
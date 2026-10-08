import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { cssDeclarations, scopeDynamicStyle } from "@/lib/page-builder/style";

describe("scopeDynamicStyle", () => {
  it("serializes styles with px units, unitless props, custom properties and !important", () => {
    expect(cssDeclarations({ padding: 8, zIndex: 3, marginTop: "4px", color: undefined, "--pg-cols": 2 } as never)).toBe(
      "padding: 8px !important; z-index: 3 !important; margin-top: 4px !important; --pg-cols: 2 !important",
    );
  });
  it("returns an empty node for empty styles", () => {
    const s = scopeDynamicStyle("block-1-hero", {});
    expect(s.className).toBe("");
    expect(s.node).toBeNull();
  });
  it("builds a content-addressed class and a style element", () => {
    const a = scopeDynamicStyle("block-1-hero", { color: "#ff0000" });
    const b = scopeDynamicStyle("block-2-other", { color: "#ff0000" });
    expect(a.className).toMatch(/^pbx-block-1-hero-[a-z0-9]{1,6}$/);
    expect(a.className.split("-").slice(-1)[0]).toMatch(/^[a-z0-9]{1,6}$/);
    expect(a.node).not.toBeNull();
    const el = a.node as React.ReactElement;
    expect(isValidElement(el)).toBe(true);
    expect((el.props as Record<string, unknown>).href).toBe(a.className);
    expect(String((el.props as Record<string, unknown>).children)).toContain(`.${a.className} { color: #ff0000 !important }`);
    // different label, same values → different class (readability), still correct rule
    expect(b.className).not.toBe(a.className);
  });
});

import { describe, expect, it } from "vitest";
import {
  MAX_FONT_BYTES,
  customFontFamilies,
  customFontOptions,
  fontStackFor,
  renderCustomFontFaces,
  renderFontFace,
  sanitizeFontFamily,
  validateFontBytes,
  validateFontFamily,
  validateFontStyle,
  validateFontWeight,
  type CustomFontFile,
} from "./custom-fonts";

function font(over: Partial<CustomFontFile> = {}): CustomFontFile {
  return {
    id: "abc123",
    family: "Canopy Display",
    weight: "400",
    style: "normal",
    mono: false,
    mimeType: "font/woff2",
    size: 1024,
    filename: "canopy.woff2",
    createdAt: "2026-09-28T00:00:00.000Z",
    ...over,
  };
}

describe("sanitizeFontFamily", () => {
  it("keeps letters, numbers, spaces, and hyphens", () => {
    expect(sanitizeFontFamily("Canopy Display 2")).toBe("Canopy Display 2");
    expect(sanitizeFontFamily("Source-Serif")).toBe("Source-Serif");
  });

  it("strips characters that could break out of a CSS string", () => {
    expect(sanitizeFontFamily("Evil'; } body { display:none }")).toBe("Evil body displaynone");
  });

  it("drops quotes, braces, semicolons, and parens", () => {
    const out = sanitizeFontFamily(`a"b'c;d(e)f{g}h:i\\j`);
    expect(out).toBe("abcdefghij");
  });

  it("collapses repeated whitespace", () => {
    expect(sanitizeFontFamily("A    B")).toBe("A B");
  });
});

describe("validateFontFamily", () => {
  it("accepts a normal name and returns the cleaned value", () => {
    const result = validateFontFamily("  Canopy Display  ");
    expect(result).toEqual({ ok: true, family: "Canopy Display" });
  });

  it("rejects a name that sanitizes to nothing", () => {
    expect(validateFontFamily(";;;").ok).toBe(false);
  });

  it("rejects an over-long name", () => {
    expect(validateFontFamily("a".repeat(61)).ok).toBe(false);
  });
});

describe("validateFontWeight / validateFontStyle", () => {
  it("accepts 100-900 and variable", () => {
    for (const w of ["100", "400", "900", "variable"]) {
      expect(validateFontWeight(w)).toEqual({ ok: true, weight: w });
    }
  });

  it("rejects off-scale and non-numeric weights", () => {
    for (const w of ["0", "450", "bold", "-700", ""]) {
      expect(validateFontWeight(w).ok).toBe(false);
    }
  });

  it("normalizes anything that is not italic to normal", () => {
    expect(validateFontStyle("italic")).toBe("italic");
    expect(validateFontStyle("ITALIC")).toBe("italic");
    expect(validateFontStyle("oblique")).toBe("normal");
    expect(validateFontStyle("")).toBe("normal");
  });
});

describe("validateFontBytes", () => {
  const woff2 = Buffer.concat([Buffer.from("wOF2", "latin1"), Buffer.alloc(16)]);
  const woff = Buffer.concat([Buffer.from("wOFF", "latin1"), Buffer.alloc(16)]);
  const otf = Buffer.concat([Buffer.from("OTTO", "latin1"), Buffer.alloc(16)]);
  const ttf = Buffer.concat([Buffer.from([0x00, 0x01, 0x00, 0x00]), Buffer.alloc(16)]);

  it("detects each supported container from its magic bytes", () => {
    expect(validateFontBytes(woff2, "font/woff2")).toEqual({ ok: true, mimeType: "font/woff2" });
    expect(validateFontBytes(woff, "font/woff")).toEqual({ ok: true, mimeType: "font/woff" });
    expect(validateFontBytes(otf, "font/otf")).toEqual({ ok: true, mimeType: "font/otf" });
    expect(validateFontBytes(ttf, "font/ttf")).toEqual({ ok: true, mimeType: "font/ttf" });
  });

  it("trusts the bytes over a wrong declared type", () => {
    expect(validateFontBytes(woff2, "font/woff")).toEqual({ ok: true, mimeType: "font/woff2" });
  });

  it("tolerates the generic octet-stream type browsers send", () => {
    expect(validateFontBytes(woff2, "application/octet-stream").ok).toBe(true);
  });

  it("rejects a non-font payload", () => {
    const exe = Buffer.from("MZ\u0090\u0000", "latin1");
    expect(validateFontBytes(exe, "application/octet-stream").ok).toBe(false);
  });

  it("rejects an empty file", () => {
    expect(validateFontBytes(Buffer.alloc(0), "font/woff2").ok).toBe(false);
  });

  it("rejects a file over the size cap", () => {
    const big = Buffer.concat([Buffer.from("wOF2", "latin1"), Buffer.alloc(MAX_FONT_BYTES)]);
    expect(validateFontBytes(big, "font/woff2").ok).toBe(false);
  });
});

describe("fontStackFor", () => {
  it("quotes the family and adds a generic fallback", () => {
    expect(fontStackFor("Canopy Display")).toBe("'Canopy Display', system-ui, sans-serif");
  });

  it("uses a monospace fallback when flagged", () => {
    expect(fontStackFor("Canopy Mono", true)).toBe("'Canopy Mono', ui-monospace, monospace");
  });

  it("sanitizes the family before embedding it", () => {
    expect(fontStackFor("A';x")).toBe("'Ax', system-ui, sans-serif");
  });
});

describe("renderFontFace", () => {
  it("emits a src pointing at the font route with the right format", () => {
    const css = renderFontFace(font({ id: "f1" }));
    expect(css).toContain("font-family: 'Canopy Display';");
    expect(css).toContain("url('/api/custom-fonts/f1') format('woff2')");
    expect(css).toContain("font-weight: 400;");
    expect(css).toContain("font-style: normal;");
    expect(css).toContain("font-display: swap;");
  });

  it("maps ttf to truetype and otf to opentype", () => {
    expect(renderFontFace(font({ mimeType: "font/ttf" }))).toContain("format('truetype')");
    expect(renderFontFace(font({ mimeType: "font/otf" }))).toContain("format('opentype')");
  });

  it("expands a variable font to the full weight range", () => {
    expect(renderFontFace(font({ weight: "variable" }))).toContain("font-weight: 100 900;");
  });

  it("passes italic through", () => {
    expect(renderFontFace(font({ style: "italic" }))).toContain("font-style: italic;");
  });

  it("sanitizes the family so it cannot escape the declaration", () => {
    const css = renderFontFace(font({ family: "Bad'; } body { display: none }" }));
    expect(css).toContain("font-family: 'Bad body display none';");
    expect(css).not.toContain("body { display: none }");
  });

  it("only ever references the id in the url", () => {
    expect(renderFontFace(font({ id: "../../etc/passwd" }))).toContain("url('/api/custom-fonts/../../etc/passwd')");
  });
});

describe("renderCustomFontFaces", () => {
  it("returns nothing when no fonts are uploaded", () => {
    expect(renderCustomFontFaces([])).toBe("");
  });

  it("emits one rule per file", () => {
    const css = renderCustomFontFaces([font({ id: "a" }), font({ id: "b", weight: "700" })]);
    expect(css.match(/@font-face/g)).toHaveLength(2);
  });
});

describe("customFontFamilies / customFontOptions", () => {
  it("collapses a family uploaded at several weights into one entry", () => {
    const families = customFontFamilies([
      font({ id: "a", weight: "400" }),
      font({ id: "b", weight: "700" }),
      font({ id: "c", family: "Other", weight: "400" }),
    ]);
    expect(families).toEqual(["Canopy Display", "Other"]);
  });

  it("produces one dropdown option per family", () => {
    const options = customFontOptions([
      font({ id: "a", weight: "400" }),
      font({ id: "b", weight: "700" }),
    ]);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      value: "'Canopy Display', system-ui, sans-serif",
      label: "Canopy Display",
      custom: true,
      mono: false,
    });
  });

  it("marks a family mono when any of its files is", () => {
    const options = customFontOptions([
      font({ id: "a", weight: "400" }),
      font({ id: "b", weight: "700", mono: true }),
    ]);
    expect(options[0].mono).toBe(true);
    expect(options[0].value).toBe("'Canopy Display', ui-monospace, monospace");
  });

  it("keeps option values unique so they are safe as React keys", () => {
    const options = customFontOptions([font({ family: "A B" }), font({ id: "z", family: "A-B" })]);
    expect(new Set(options.map((o) => o.value)).size).toBe(options.length);
  });

  it("returns nothing for an empty upload list", () => {
    expect(customFontOptions([])).toEqual([]);
  });
});

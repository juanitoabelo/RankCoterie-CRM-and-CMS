import { describe, it, expect } from "vitest";
import {
  GEO_IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  normalizeHeader,
  parseGeoCategoryImport,
  slugifySlug,
  summarizeImportRows,
} from "./geo-category-import";

const HEADER = GEO_IMPORT_COLUMNS.map((c) => c.header);

function parse(
  data: string[][],
  opts: { updateExisting?: boolean; existing?: string[]; assets?: string[] } = {},
) {
  return parseGeoCategoryImport([HEADER, ...data], {
    updateExisting: opts.updateExisting ?? false,
    existingSlugs: new Set(opts.existing ?? []),
    ...(opts.assets ? { knownAssetIds: new Set(opts.assets) } : {}),
  });
}

function ok(result: ReturnType<typeof parseGeoCategoryImport>) {
  if (!result.ok) throw new Error(`expected ok, got: ${result.error}`);
  return result;
}

describe("normalizeHeader", () => {
  it("lowercases and strips punctuation/spacing differences", () => {
    expect(normalizeHeader("  Focus-Keyphrase ")).toBe("focus keyphrase");
    expect(normalizeHeader("SEO_Title")).toBe("seo title");
    expect(normalizeHeader("SeoTitle")).toBe("seotitle");
  });
});

describe("slugifySlug", () => {
  it("slugifies titles including accents", () => {
    expect(slugifySlug("Café & Bar — NYC!")).toBe("cafe-bar-nyc");
    expect(slugifySlug("  Spaced   Out  ")).toBe("spaced-out");
    expect(slugifySlug("!!!")).toBe("");
  });
});

describe("parseGeoCategoryImport", () => {
  it("creates rows from a minimal title-only file and derives the slug", () => {
    const result = ok(parse([["Austin"]]));
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      row: 2,
      title: "Austin",
      slug: "austin",
      action: "create",
      errors: [],
    });
    expect(result.rows[0].values.status).toBeNull();
  });

  it("requires a Title column in the header", () => {
    const result = parseGeoCategoryImport([["Nope"], ["x"]], {
      updateExisting: false,
      existingSlugs: new Set(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Title");
  });

  it("accepts legacy header aliases and reports ignored columns", () => {
    const matrix = [
      ["Category Title", "Domain Key", "StateDesc", "Keywords", "Junk Column"],
      ["Test", "test-slug", "state copy", "one, two", "ignored"],
    ];
    const result = ok(
      parseGeoCategoryImport(matrix, { updateExisting: false, existingSlugs: new Set() }),
    );
    expect(result.ignoredColumns).toEqual(["Junk Column"]);
    expect(result.rows[0]).toMatchObject({ title: "Test", slug: "test-slug", action: "create" });
    expect(result.rows[0].values.stateDesc).toBe("state copy");
    expect(result.rows[0].values.metaKeywords).toBe(JSON.stringify(["one", "two"]));
  });

  it("errors when no data rows exist below the header", () => {
    const result = parseGeoCategoryImport([HEADER], {
      updateExisting: false,
      existingSlugs: new Set(),
    });
    expect(result).toEqual({ ok: false, error: "No data rows found below the header row." });
  });

  it("caps imports at 1000 data rows", () => {
    const matrix = [HEADER, ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => ["T"])];
    const result = parseGeoCategoryImport(matrix, {
      updateExisting: false,
      existingSlugs: new Set(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Too many rows");
  });

  it("flags missing titles, invalid statuses and bad canonical URLs", () => {
    const result = ok(
      parse(
        [
          ["", "", "", "", "", "", "", "", "", "", "", "BOGUS", "", "", "", "", "ftp://nope", ""],
          ["Fine", "fine", "", "", "", "", "", "", "", "", "", "draft", "", "", "", "", "/ok", ""],
        ],
        { updateExisting: true },
      ),
    );
    expect(result.rows[0].errors.join(" ")).toContain("Title is required.");
    expect(result.rows[0].errors.join(" ")).toContain("must be LIVE, DRAFT or HIDDEN");
    expect(result.rows[0].errors.join(" ")).toContain("Canonical URL");
    expect(result.rows[1].errors).toEqual([]);
    expect(result.rows[1].values.status).toBe("DRAFT");
    expect(result.rows[1].values.canonicalUrl).toBe("/ok");
  });

  it("marks existing slugs as update or skip based on the flag", () => {
    const asUpdate = ok(parse([["A", "existing"]], { updateExisting: true, existing: ["existing"] }));
    expect(asUpdate.rows[0].action).toBe("update");
    const asSkip = ok(parse([["A", "existing"]], { updateExisting: false, existing: ["existing"] }));
    expect(asSkip.rows[0].action).toBe("skip");
  });

  it("rejects duplicate slugs inside the same file", () => {
    const result = ok(
      parse(
        [
          ["One", "same-slug"],
          ["Two", "Same Slug"],
        ],
        { updateExisting: true },
      ),
    );
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[1].errors[0]).toContain('Duplicate slug "same-slug" (also on row 2)');
  });

  it("accepts JSON-array keywords and rejects invalid JSON", () => {
    const result = ok(
      parse(
        [
          ["A", "a-slug", "", "", "", "", "", "", "", "", "", "", "", "", '["x", "y"]', "", "", ""],
          ["B", "b-slug", "", "", "", "", "", "", "", "", "", "", "", "", "[not json", "", "", ""],
        ],
        { updateExisting: true },
      ),
    );
    expect(result.rows[0].values.metaKeywords).toBe(JSON.stringify(["x", "y"]));
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[1].errors.join(" ")).toContain("Meta Keywords");
  });

  it("ignores blank rows but keeps original sheet row numbers", () => {
    const matrix = [HEADER, ["Keep", "keep-slug"], [], ["Also", "also-slug"]];
    const result = ok(
      parseGeoCategoryImport(matrix, { updateExisting: false, existingSlugs: new Set() }),
    );
    expect(result.rows.map((r) => r.row)).toEqual([2, 4]);
  });

  it("summarizes create/update/skip/error counts", () => {
    const result = ok(
      parse(
        [
          ["New", "new-one"],
          ["Old", "old-one"],
          ["Bad", ""],
        ],
        { updateExisting: true, existing: ["old-one"] },
      ),
    );
    // "Bad" slugifies from title → "bad" (valid) — force an actual error instead:
    const withError = ok(
      parse([["X", "x-slug", "", "", "", "", "", "", "", "", "", "NOPE", "", "", "", "", "", ""]], {
        updateExisting: true,
      }),
    );
    expect(summarizeImportRows(result.rows)).toEqual({
      total: 3,
      create: 2,
      update: 1,
      skip: 0,
      error: 0,
    });
    expect(summarizeImportRows(withError.rows).error).toBe(1);
  });

  it("accepts image asset IDs and /api/assets/ URLs when the asset exists", () => {
    const result = ok(
      parse(
        [
          ["Img", "img-slug", "", "", "", "", "", "", "/api/assets/abc123", "state-asset", "", "", "", "", "", "", "", ""],
          ["Img2", "img2-slug", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "/img/social.png"],
        ],
        { assets: ["abc123", "state-asset"] },
      ),
    );
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[0].values.parentImageAssetId).toBe("abc123");
    expect(result.rows[0].values.stateImageAssetId).toBe("state-asset");
    expect(result.rows[0].values.cityImageAssetId).toBeNull();
    expect(result.rows[1].values.ogImage).toBe("/img/social.png");
  });

  it("rejects image cells that are not in the Media Library", () => {
    const result = ok(
      parse(
        [["Img", "img-slug", "", "", "", "", "", "", "missing-asset", "", "", "", "", "", "", "", "", ""]],
        { assets: [] },
      ),
    );
    expect(result.rows[0].errors.join(" ")).toContain(
      'Parent Image "missing-asset" was not found in the Media Library',
    );
    expect(summarizeImportRows(result.rows).error).toBe(1);
  });

  it("passes image cells through unvalidated when no asset set is provided", () => {
    const result = ok(
      parse([["Img", "img-slug", "", "", "", "", "", "", "whatever-id", "", "", "", "", "", "", "", "", ""]]),
    );
    expect(result.rows[0].errors).toEqual([]);
    expect(result.rows[0].values.parentImageAssetId).toBe("whatever-id");
  });

  it("validates OG Image like other URLs", () => {
    const result = ok(
      parse(
        [
          ["A", "a-slug", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "not a url"],
          ["B", "b-slug", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "https://x/y.png"],
        ],
        { assets: [] },
      ),
    );
    expect(result.rows[0].errors.join(" ")).toContain("OG Image must start with");
    expect(result.rows[1].errors).toEqual([]);
    expect(result.rows[1].values.ogImage).toBe("https://x/y.png");
  });
});

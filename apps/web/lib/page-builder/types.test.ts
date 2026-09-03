import { describe, expect, it } from "vitest";
import {
  BLOCK_DEFINITIONS,
  COLUMN_SPANS,
  FULL_COLUMN_SPANS,
  LEAF_BLOCK_TYPES,
  createBlock,
  createRowLayout,
  isRowBlock,
  type Block,
  type BlockType,
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

  it("defaults row background settings", () => {
    const row = createBlock("row") as RowBlock;
    expect(row.props.bgImage).toBe("");
    expect(row.props.textColor).toBeUndefined();
    expect(row.props.paddingY).toBe(24);
    expect(row.props.fullWidth).toBe(false);
  });
});

describe("createRowLayout", () => {
  it("defaults stackOnMobile to true", () => {
    const row = createRowLayout("two-halves");
    expect(row.props.stackOnMobile).toBe(true);
    expect(row.props.bgImage).toBe("");
    expect(row.props.paddingY).toBe(24);
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
    expect(isRowBlock(createBlock("heading"))).toBe(false);
    expect(isRowBlock(createBlock("contentGrid"))).toBe(false);
  });
});

describe("createBlock — new leaf types", () => {
  it("heading defaults to H2, left aligned", () => {
    const h = createBlock("heading") as Block & {
      props: { text: string; level: 1 | 2 | 3 | 4 | 5 | 6; align: "left" | "center" | "right" };
    };
    expect(h.props.level).toBe(2);
    expect(h.props.align).toBe("left");
    expect(h.props.text).toBeTruthy();
  });

  it("list defaults to bullets with three items", () => {
    const l = createBlock("list") as Block & { props: { ordered: boolean; items: string[] } };
    expect(l.props.ordered).toBe(false);
    expect(l.props.items).toHaveLength(3);
  });

  it("slider defaults to one empty slide at medium height", () => {
    const s = createBlock("slider") as Block & {
      props: {
        slides: Array<{ src: string }>;
        height: "sm" | "md" | "lg";
        itemsPerView: number;
        imageFit: "cover" | "fluid";
        captionLayout: "bottom" | "center";
      };
    };
    expect(s.props.slides).toHaveLength(1);
    expect(s.props.slides[0].src).toBe("");
    expect(s.props.height).toBe("md");
    expect(s.props.itemsPerView).toBe(1);
    expect(s.props.imageFit).toBe("cover");
    expect(s.props.captionLayout).toBe("bottom");
  });

  it("contentGrid defaults to articles, all categories, 6 per page, 3 columns, newest first", () => {
    const g = createBlock("contentGrid") as Block & {
      props: {
        source: "articles" | "feeds";
        categoryId: string;
        perPage: number;
        columns: 2 | 3 | 4;
        showExcerpt: boolean;
        order: "asc" | "desc";
      };
    };
    expect(g.props.source).toBe("articles");
    expect(g.props.categoryId).toBe("");
    expect(g.props.perPage).toBe(6);
    expect(g.props.columns).toBe(3);
    expect(g.props.showExcerpt).toBe(true);
    expect(g.props.order).toBe("desc");
  });

  it("clones slider slide arrays so blocks never share state", () => {
    const a = createBlock("slider") as Block & {
      props: {
        slides: Array<{ src: string; alt: string; title: string; caption: string; url: string; buttonText: string; buttonUrl: string }>;
      };
    };
    const b = createBlock("slider");
    (a.props.slides as Array<{ src: string }>)[0].src = "/one.jpg";
    expect(
      (b as Block & { props: { slides: Array<{ src: string }> } }).props.slides[0].src,
    ).toBe("");
  });

  it("deep-clones nested style objects so blocks never share state", () => {
    const a = createBlock("text") as Block & {
      props: { style?: { mobile?: { color?: string }; lg?: { color?: string } } };
    };
    const b = createBlock("text") as Block & {
      props: { style?: { mobile?: { color?: string }; lg?: { color?: string } } };
    };
    a.props.style = { mobile: { color: "#ff0000" }, lg: { color: "#00ff00" } };
    expect(b.props.style).toBeUndefined();
  });

  it("every new leaf type has a block definition", () => {
    const defined = new Set<BlockType>(BLOCK_DEFINITIONS.map((d) => d.type));
    for (const t of ["heading", "list", "slider", "contentGrid"] as BlockType[]) {
      expect(defined.has(t)).toBe(true);
    }
  });
});

describe("LEAF_BLOCK_TYPES", () => {
  it("includes the content blocks and excludes rows", () => {
    expect(LEAF_BLOCK_TYPES).toContain("heading");
    expect(LEAF_BLOCK_TYPES).toContain("list");
    expect(LEAF_BLOCK_TYPES).toContain("slider");
    expect(LEAF_BLOCK_TYPES).toContain("contentGrid");
    expect(LEAF_BLOCK_TYPES).not.toContain("row");
  });
});

describe("COLUMN_SPANS", () => {
  it("contains valid span values", () => {
    expect(COLUMN_SPANS).toEqual([3, 4, 6, 8, 12]);
  });

  it("FULL_COLUMN_SPANS covers the whole 1–12 grid", () => {
    expect(FULL_COLUMN_SPANS).toHaveLength(12);
    expect(FULL_COLUMN_SPANS[0]).toBe(1);
    expect(FULL_COLUMN_SPANS[11]).toBe(12);
  });
});

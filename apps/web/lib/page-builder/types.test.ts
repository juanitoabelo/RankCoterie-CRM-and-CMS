import { describe, expect, it } from "vitest";
import {
  BLOCK_DEFINITIONS,
  COLUMN_SPANS,
  FULL_COLUMN_SPANS,
  LAYOUT_CONTAINER_ID,
  LAYOUT_ROW_ID,
  LEAF_BLOCK_TYPES,
  ROW_LAYOUTS,
  createBlock,
  createLayoutBlock,
  createRowLayout,
  createSectionBlock,
  createSingleColumnRow,
  isRowBlock,
  isSectionBlock,
  pickRowLayouts,
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

  it("builds the blog content-sidebar preset from shared layouts", () => {
    const row = createRowLayout("content-sidebar");
    expect(row.props.columns.map((c) => c.span)).toEqual([8, 4]);
  });

  it("builds a single column for the raw row layout id", () => {
    const row = createRowLayout(LAYOUT_ROW_ID);
    expect(row.props.columns.map((c) => c.span)).toEqual([12]);
  });
});

describe("createSectionBlock", () => {
  it("creates an empty full-width section", () => {
    const section = createSectionBlock();
    expect(section.type).toBe("section");
    expect(section.props.rows).toEqual([]);
    expect(section.props.width).toBe("full");
    expect(section.props.bgColor).toBeUndefined();
    expect(section.props.paddingTop).toBe(24);
    expect(isSectionBlock(section)).toBe(true);
  });
});

describe("createSingleColumnRow", () => {
  it("creates a row with one 12-span column", () => {
    const row = createSingleColumnRow();
    expect(row.type).toBe("row");
    expect(row.props.columns).toEqual([
      expect.objectContaining({ span: 12, blocks: [] }),
    ]);
    expect(row.props.fullWidth).toBe(true);
  });
});

describe("createLayoutBlock", () => {
  it("maps the container id to a section", () => {
    const block = createLayoutBlock(LAYOUT_CONTAINER_ID);
    expect(isSectionBlock(block)).toBe(true);
  });

  it("maps the row id to a single-column row", () => {
    const block = createLayoutBlock(LAYOUT_ROW_ID) as RowBlock;
    expect(block.type).toBe("row");
    expect(block.props.columns.map((c) => c.span)).toEqual([12]);
  });

  it("maps presets to rows with matching spans", () => {
    const block = createLayoutBlock("content-sidebar") as RowBlock;
    expect(block.props.columns.map((c) => c.span)).toEqual([8, 4]);
  });
});

describe("ROW_LAYOUTS", () => {
  it("is a single source of truth for every builder preset", () => {
    const ids = ROW_LAYOUTS.map((l) => l.id);
    expect(ids).toContain("content-sidebar");
    expect(ids).toContain("sidebar-content");
    expect(ids).toContain("logo-nav");
    expect(ids).toContain("logo-center-nav");
    expect(ids).toContain("footer-four");
  });

  it("pickRowLayouts picks from the shared list in canonical order", () => {
    const picked = pickRowLayouts(["three", "two-halves"]);
    expect(picked.map((l) => l.id)).toEqual(["two-halves", "three"]);
    const all = pickRowLayouts(ROW_LAYOUTS.map((l) => l.id));
    expect(all).toHaveLength(ROW_LAYOUTS.length);
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

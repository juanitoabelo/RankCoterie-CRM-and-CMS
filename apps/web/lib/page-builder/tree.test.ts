import { describe, expect, it } from "vitest";
import {
  createBlock,
  type Block,
  type RowBlock,
  type TextBlock,
} from "./types";
import {
  addBlockFromPalette,
  cloneBlock,
  duplicateBlock,
  duplicateColumn,
  findBlock,
  findColumnForBlock,
  flattenIds,
  moveBlock,
  removeBlock,
  removeColumnFromRow,
  replaceBlock,
  updateBlockProps,
  updateColumnProps,
} from "./tree";

function textBlock(): TextBlock {
  return createBlock("text") as TextBlock;
}

function spacerBlock(): Block {
  return createBlock("spacer");
}

function rowBlock(): RowBlock {
  return createBlock("row") as RowBlock;
}

/** [rowA/1, textTop, rowB/1] */
function fixture() {
  const rowA = rowBlock();
  const rowB = rowBlock();
  const textA = textBlock();
  const textB = spacerBlock();
  const textTop = textBlock();
  const blocks: Block[] = [
    { ...rowA, props: { ...rowA.props, columns: [{ id: "col-a", span: 6, blocks: [textA] }] } },
    textTop,
    { ...rowB, props: { ...rowB.props, columns: [{ id: "col-b", span: 6, blocks: [textB] }] } },
  ];
  return { blocks, rowA, rowB, textA, textB, textTop };
}

describe("findColumnForBlock", () => {
  it("finds a column for a nested block and not for top-level ones", () => {
    const { blocks, textA, textTop } = fixture();
    expect(findColumnForBlock(blocks, textA.id)?.columnId).toBe("col-a");
    expect(findColumnForBlock(blocks, textTop.id)).toBeNull();
  });
});

describe("updateBlockProps", () => {
  it("updates nested and top-level blocks by id", () => {
    const { blocks, textA, textTop } = fixture();
    const next = updateBlockProps(blocks, textA.id, { ...textA.props, content: "<p>hi</p>" });
    expect(findBlock(next, textA.id)?.type).toBe("text");
    const nextTop = updateBlockProps(blocks, textTop.id, { ...textTop.props, align: "center" });
    const top = findBlock(nextTop, textTop.id);
    expect(top?.type === "text" && top.props.align).toBe("center");
  });
});

describe("removeBlock", () => {
  it("removes a nested block and keeps structure", () => {
    const { blocks, textA } = fixture();
    const next = removeBlock(blocks, textA.id);
    expect(findBlock(next, textA.id)).toBeNull();
    expect(next).toHaveLength(3);
  });

  it("removes a whole row", () => {
    const { blocks, rowA } = fixture();
    const next = removeBlock(blocks, rowA.id);
    expect(next).toHaveLength(2);
    expect(findBlock(next, rowA.id)).toBeNull();
  });
});

describe("moveBlock", () => {
  it("top-level reorder", () => {
    const { blocks, rowA, textTop } = fixture();
    const next = moveBlock(blocks, textTop.id, rowA.id);
    expect(next[0].id).toBe(textTop.id);
    expect(next[1].id).toBe(rowA.id);
  });

  it("nested → top level (inserts at over position)", () => {
    const { blocks, textA } = fixture();
    const next = moveBlock(blocks, textA.id, blocks[2].id);
    expect(findColumnForBlock(next, textA.id)).toBeNull();
    expect(next.map((b) => b.id)).toContain(textA.id);
  });

  it("top level → column (append onto empty column)", () => {
    const { blocks, textTop } = fixture();
    const next = moveBlock(blocks, textTop.id, "col-b");
    expect(findColumnForBlock(next, textTop.id)?.columnId).toBe("col-b");
    expect(next.some((b) => b.id === textTop.id)).toBe(false);
  });

  it("column → other column", () => {
    const { blocks, textA } = fixture();
    const next = moveBlock(blocks, textA.id, "col-b");
    expect(findColumnForBlock(next, textA.id)?.columnId).toBe("col-b");
  });

  it("same-column reorder", () => {
    const { blocks, rowA } = fixture();
    const row = {
      ...rowA,
      props: {
        ...rowA.props,
        columns: [{ id: "col-a", span: 6, blocks: [textBlock(), spacerBlock()] }],
      },
    } satisfies RowBlock;
    const withTwo = blocks.map((b) => (b.id === rowA.id ? row : b));
    const [first, second] = row.props.columns[0].blocks;
    const next = moveBlock(withTwo, first.id, second.id);
    const col = findColumnForBlock(next, first.id)!;
    expect(col.column.blocks.map((b) => b.id)).toEqual([second.id, first.id]);
  });

  it("does not move a row into a column", () => {
    const { blocks, rowB } = fixture();
    const next = moveBlock(blocks, rowB.id, "col-a");
    expect(next.map((b) => b.id)).toEqual(blocks.map((b) => b.id));
  });
});

describe("addBlockFromPalette", () => {
  it("appends to top level with no target", () => {
    const { blocks } = fixture();
    const mb = spacerBlock();
    const next = addBlockFromPalette(blocks, mb);
    expect(next[next.length - 1].id).toBe(mb.id);
  });

  it("drops a row block at top level even over a column", () => {
    const { blocks } = fixture();
    const row = createBlock("row");
    const next = addBlockFromPalette(blocks, row, "col-a");
    expect(findColumnForBlock(next, row.id)).toBeNull();
    expect(next.some((b) => b.id === row.id)).toBe(true);
  });

  it("inserts into a column after the hovered block", () => {
    const { blocks, textA } = fixture();
    const mb = spacerBlock();
    const next = addBlockFromPalette(blocks, mb, textA.id);
    const col = findColumnForBlock(next, textA.id)!;
    expect(col.column.blocks.map((b) => b.id)).toEqual([textA.id, mb.id]);
  });

  it("appends into an empty column droppable", () => {
    const { blocks } = fixture();
    const mb = spacerBlock();
    const next = addBlockFromPalette(blocks, mb, "col-a");
    const colA = (next.find((b) => b.type === "row") as RowBlock).props.columns[0];
    expect(colA.blocks.map((b) => b.id)).toEqual([
      ...(blocks[0] as RowBlock).props.columns[0].blocks.map((b) => b.id),
      mb.id,
    ]);
  });
});

describe("duplicateBlock", () => {
  it("duplicates a top-level block with a fresh id", () => {
    const { blocks, textTop } = fixture();
    const next = duplicateBlock(blocks, textTop.id);
    expect(next).toHaveLength(4);
    expect(next[1].id).toBe(textTop.id);
    const copy = next[2];
    expect(copy.id).not.toBe(textTop.id);
    expect(copy.type).toBe(textTop.type);
    expect(next.map((b) => b.id).filter((id) => id === textTop.id)).toHaveLength(1);
  });

  it("duplicates a nested block inside its column right after the original", () => {
    const { blocks, textA } = fixture();
    const next = duplicateBlock(blocks, textA.id);
    const col = findColumnForBlock(next, textA.id)!.column;
    expect(col.blocks).toHaveLength(2);
    expect(col.blocks[1].id).not.toBe(textA.id);
    expect(findColumnForBlock(next, col.blocks[1].id)?.columnId).toBe("col-a");
    expect(next).toHaveLength(3);
  });

  it("duplicates a row with fresh column and child ids", () => {
    const { blocks, rowA, textA } = fixture();
    const next = duplicateBlock(blocks, rowA.id);
    expect(next).toHaveLength(4);
    const copy = next[1];
    expect(copy.type).toBe("row");
    const copyCol = (copy as RowBlock).props.columns[0];
    expect(copyCol.id).not.toBe("col-a");
    expect(copyCol.blocks[0].id).not.toBe(textA.id);
  });
});

describe("cloneBlock", () => {
  it("produces an independent deep copy", () => {
    const original = createBlock("features");
    const items = (original.props as unknown as { items: Array<{ title: string }> }).items;
    const copy = cloneBlock(original);
    expect(copy.id).not.toBe(original.id);
    const copyItems = (copy.props as unknown as { items: Array<{ title: string }> }).items;
    expect(copyItems).not.toBe(items);
    copyItems[0].title = "mutated";
    expect(items[0].title).not.toBe("mutated");
  });
});

describe("replaceBlock", () => {
  it("replaces a top-level block but keeps its id", () => {
    const { blocks, textTop } = fixture();
    const hero = { ...createBlock("hero"), id: textTop.id };
    const next = replaceBlock(blocks, textTop.id, hero);
    expect(next[1].id).toBe(textTop.id);
    expect(next[1].type).toBe("hero");
  });

  it("replaces a nested block in place", () => {
    const { blocks, textA } = fixture();
    const button = { ...createBlock("button"), id: textA.id };
    const next = replaceBlock(blocks, textA.id, button);
    expect(findColumnForBlock(next, textA.id)?.column.blocks[0].type).toBe("button");
  });
});

describe("findBlock", () => {
  it("returns null for a non-existent id", () => {
    const { blocks } = fixture();
    expect(findBlock(blocks, "nonexistent")).toBeNull();
  });

  it("finds a top-level block", () => {
    const { blocks, textTop } = fixture();
    expect(findBlock(blocks, textTop.id)?.type).toBe("text");
  });

  it("finds a nested block inside a row column", () => {
    const { blocks, textA } = fixture();
    expect(findBlock(blocks, textA.id)?.type).toBe("text");
  });

  it("finds a nested block across multiple rows", () => {
    const { blocks, textB } = fixture();
    expect(findBlock(blocks, textB.id)?.type).toBe("spacer");
  });

  it("finds blocks in multi-column rows", () => {
    const row = rowBlock();
    const innerA = textBlock();
    const innerB = textBlock();
    const blocks: Block[] = [
      {
        ...row,
        props: {
          ...row.props,
          columns: [
            { id: "c1", span: 6, blocks: [innerA] },
            { id: "c2", span: 6, blocks: [innerB] },
          ],
        },
      },
    ];
    expect(findBlock(blocks, innerA.id)?.id).toBe(innerA.id);
    expect(findBlock(blocks, innerB.id)?.id).toBe(innerB.id);
  });
});

function twoColumnRow(): RowBlock {
  const row = rowBlock();
  return {
    ...row,
    props: {
      ...row.props,
      columns: [
        { id: "col-1", span: 6, blocks: [] },
        { id: "col-2", span: 6, blocks: [] },
      ],
    },
  } as RowBlock;
}

describe("updateColumnProps", () => {
  it("updates a column's span", () => {
    const blocks: Block[] = [twoColumnRow()];
    const next = updateColumnProps(blocks, "col-1", { span: 12 });
    const row = next.find((b) => b.type === "row") as RowBlock;
    expect(row.props.columns[0].span).toBe(12);
  });

  it("updates a column's background", () => {
    const blocks: Block[] = [twoColumnRow()];
    const next = updateColumnProps(blocks, "col-2", {
      bgColor: "#000000",
      bgImage: "/bg.jpg",
    });
    const row = next.find((b) => b.type === "row") as RowBlock;
    const colB = row.props.columns.find((c) => c.id === "col-2")!;
    expect(colB.bgColor).toBe("#000000");
    expect(colB.bgImage).toBe("/bg.jpg");
  });

  it("preserves blocks and other columns", () => {
    const base = twoColumnRow();
    const textA = textBlock();
    base.props.columns[0].blocks.push(textA);
    const blocks: Block[] = [base];
    const next = updateColumnProps(blocks, "col-1", { span: 8 });
    const row = next.find((b) => b.type === "row") as RowBlock;
    expect(row.props.columns[0].blocks.some((b) => b.id === textA.id)).toBe(true);
    expect(row.props.columns[1].span).toBe(6);
  });

  it("returns the same tree when the column is not found", () => {
    const blocks: Block[] = [twoColumnRow()];
    expect(updateColumnProps(blocks, "nope", { span: 12 })).toBe(blocks);
  });
});

describe("removeColumnFromRow", () => {
  it("removes a specific column from the target row", () => {
    const row = twoColumnRow();
    row.props.columns[0].blocks.push(textBlock());
    const blocks: Block[] = [row];
    const next = removeColumnFromRow(blocks, row.id, "col-1");
    const nextRow = next.find((b) => b.id === row.id) as RowBlock;
    expect(nextRow.props.columns.map((c) => c.id)).toEqual(["col-2"]);
  });

  it("leaves other rows untouched", () => {
    const rowA = twoColumnRow();
    const rowB = twoColumnRow();
    const blocks: Block[] = [rowA, rowB];
    const next = removeColumnFromRow(blocks, rowB.id, "col-1");
    const rowANext = next.find((b) => b.id === rowA.id) as RowBlock;
    expect(rowANext.props.columns.map((c) => c.id)).toEqual(["col-1", "col-2"]);
    const rowBNext = next.find((b) => b.id === rowB.id) as RowBlock;
    expect(rowBNext.props.columns.map((c) => c.id)).toEqual(["col-2"]);
  });
});

describe("duplicateColumn", () => {
  it("inserts a copy right after the original column", () => {
    const row = twoColumnRow();
    const blocks: Block[] = [row];
    const next = duplicateColumn(blocks, row.id, "col-1");
    const nextRow = next.find((b) => b.id === row.id) as RowBlock;
    expect(nextRow.props.columns.map((c) => c.id)).toEqual(["col-1", expect.any(String), "col-2"]);
  });

  it("copies the columns widths and background", () => {
    const row = twoColumnRow();
    row.props.columns[0] = {
      ...row.props.columns[0],
      span: 8,
      spanMd: 6,
      spanSm: 12,
      bgColor: "#ff0000",
      bgImage: "/api/assets/abc",
    };
    const blocks: Block[] = [row];
    const next = duplicateColumn(blocks, row.id, "col-1");
    const nextRow = next.find((b) => b.id === row.id) as RowBlock;
    const copy = nextRow.props.columns[1];
    expect(copy.span).toBe(8);
    expect(copy.spanMd).toBe(6);
    expect(copy.spanSm).toBe(12);
    expect(copy.bgColor).toBe("#ff0000");
    expect(copy.bgImage).toBe("/api/assets/abc");
  });

  it("deep-clones nested blocks with fresh ids", () => {
    const row = twoColumnRow();
    const text = textBlock();
    row.props.columns[0].blocks.push(text);
    const blocks: Block[] = [row];
    const next = duplicateColumn(blocks, row.id, "col-1");
    const nextRow = next.find((b) => b.id === row.id) as RowBlock;
    const copy = nextRow.props.columns[1];
    expect(copy.blocks).toHaveLength(1);
    expect(copy.blocks[0].id).not.toBe(text.id);
    expect(copy.blocks[0].id).not.toBeUndefined();
    expect(duplicateColumn(blocks, row.id, "col-1")).not.toBe(blocks);
  });

  it("honours a caller-supplied id for the copy", () => {
    const row = twoColumnRow();
    const blocks: Block[] = [row];
    const next = duplicateColumn(blocks, row.id, "col-1", 6, "new-col");
    const nextRow = next.find((b) => b.id === row.id) as RowBlock;
    expect(nextRow.props.columns.map((c) => c.id)).toEqual(["col-1", "new-col", "col-2"]);
  });

  it("returns the original tree when the column or row is missing", () => {
    const row = twoColumnRow();
    const blocks: Block[] = [row];
    expect(duplicateColumn(blocks, row.id, "nope")).toBe(blocks);
    expect(duplicateColumn(blocks, "nope", "col-1")).toBe(blocks);
  });

  it("does not exceed the column limit", () => {
    const row = twoColumnRow();
    const blocks: Block[] = [row];
    const next = duplicateColumn(blocks, row.id, "col-1", 3);
    const nextRow = next.find((b) => b.id === row.id) as RowBlock;
    expect(nextRow.props.columns).toHaveLength(3);
  });
});

describe("flattenIds", () => {
  it("returns rows and nested leaves in visual order", () => {
    const { blocks, rowA, textA, textTop, rowB, textB } = fixture();
    expect(flattenIds(blocks)).toEqual([rowA.id, textA.id, textTop.id, rowB.id, textB.id]);
  });
});
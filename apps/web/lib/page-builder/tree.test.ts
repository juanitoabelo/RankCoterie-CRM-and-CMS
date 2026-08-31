import { describe, expect, it } from "vitest";
import {
  createBlock,
  type Block,
  type RowBlock,
  type TextBlock,
} from "./types";
import {
  addBlockFromPalette,
  findBlock,
  findColumnForBlock,
  moveBlock,
  removeBlock,
  updateBlockProps,
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
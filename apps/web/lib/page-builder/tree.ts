import {
  isRowBlock,
  type Block,
  type ColumnData,
  type RowBlock,
} from "./types";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function moveArray<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Map every block in the tree (rows included) through `fn`, keeping structure. */
export function mapBlocks(blocks: Block[], fn: (b: Block) => Block): Block[] {
  return blocks.map((b) => {
    if (isRowBlock(b)) {
      const row = b as RowBlock;
      return fn({
        ...row,
        props: {
          ...row.props,
          columns: row.props.columns.map((col) => ({
            ...col,
            blocks: mapBlocks(col.blocks, fn),
          })),
        },
      } as Block);
    }
    return fn(b);
  });
}

export function findBlock(blocks: Block[], blockId: string): Block | null {
  for (const b of blocks) {
    if (b.id === blockId) return b;
    if (isRowBlock(b)) {
      for (const col of b.props.columns) {
        const found = col.blocks.find((c) => c.id === blockId);
        if (found) return found;
      }
    }
  }
  return null;
}

export function columnById(blocks: Block[], columnId: string): ColumnData | null {
  for (const b of blocks) {
    if (isRowBlock(b) && !b.props.columns) continue;
    if (isRowBlock(b)) {
      const col = b.props.columns.find((c) => c.id === columnId);
      if (col) return col;
    }
  }
  return null;
}

export function rowIdForColumn(blocks: Block[], columnId: string): string | null {
  for (const b of blocks) {
    if (isRowBlock(b)) {
      if (b.props.columns.some((c) => c.id === columnId)) return b.id;
    }
  }
  return null;
}

/** The column (if any) that currently holds `blockId`. */
export function findColumnForBlock(
  blocks: Block[],
  blockId: string,
): { rowId: string; columnId: string; column: ColumnData } | null {
  for (const b of blocks) {
    if (!isRowBlock(b)) continue;
    for (const col of b.props.columns) {
      if (col.blocks.some((c) => c.id === blockId)) {
        return { rowId: b.id, columnId: col.id, column: col };
      }
    }
  }
  return null;
}

export function updateBlockProps(blocks: Block[], id: string, props: Block["props"]): Block[] {
  return mapBlocks(blocks, (b) => (b.id === id ? ({ ...b, props } as Block) : b));
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  const next: Block[] = [];
  for (const b of blocks) {
    if (b.id === id) continue;
    if (isRowBlock(b)) {
      next.push({
        ...b,
        props: {
          ...b.props,
          columns: b.props.columns.map((col) => ({
            ...col,
            blocks: col.blocks.filter((c) => c.id !== id),
          })),
        },
      } as Block);
    } else {
      next.push(b);
    }
  }
  return next;
}

function insertTop(blocks: Block[], block: Block, index: number): Block[] {
  const next = [...blocks];
  next.splice(clamp(index, 0, next.length), 0, block);
  return next;
}

function insertIntoColumn(
  blocks: Block[],
  columnId: string,
  block: Block,
  index?: number,
): Block[] {
  return mapBlocks(blocks, (b) => {
    if (isRowBlock(b)) {
      return {
        ...b,
        props: {
          ...b.props,
          columns: b.props.columns.map((col) => {
            if (col.id !== columnId) return col;
            const next = [...col.blocks];
            next.splice(clamp(index ?? next.length, 0, next.length), 0, block);
            return { ...col, blocks: next };
          }),
        },
      } as Block;
    }
    return b;
  });
}

function reorderInColumn(blocks: Block[], columnId: string, activeId: string, overId: string): Block[] {
  return mapBlocks(blocks, (b) => {
    if (isRowBlock(b)) {
      return {
        ...b,
        props: {
          ...b.props,
          columns: b.props.columns.map((col) => {
            if (col.id !== columnId) return col;
            const from = col.blocks.findIndex((x) => x.id === activeId);
            const to = col.blocks.findIndex((x) => x.id === overId);
            if (from === -1 || to === -1) return col;
            return { ...col, blocks: moveArray(col.blocks, from, to) };
          }),
        },
      } as Block;
    }
    return b;
  });
}

/**
 * Move an existing block between any locations in the tree:
 * - top level <-> top level (reorder)
 * - top level -> a column
 * - column -> column
 * - column -> top level
 * Rows always stay at the top level.
 */
export function moveBlock(blocks: Block[], activeId: string, overId: string): Block[] {
  if (activeId === overId) return blocks;

  const active = findBlock(blocks, activeId);
  if (!active) return blocks;

  const activeTopIndex = blocks.findIndex((b) => b.id === activeId);
  const activeCol = findColumnForBlock(blocks, activeId);
  const isRow = isRowBlock(active);

  const overTopIndex = blocks.findIndex((b) => b.id === overId);
  const overCol = findColumnForBlock(blocks, overId);
  const overColData = columnById(blocks, overId);

  // Same column reorder.
  if (activeCol && overCol && activeCol.columnId === overCol.columnId) {
    return reorderInColumn(blocks, activeCol.columnId, activeId, overId);
  }
  // Dropped onto its own column — no-op.
  if (activeCol && overColData && overColData.id === activeCol.columnId) {
    return blocks;
  }
  // Top-level reorder (rows and leaves).
  if (overTopIndex !== -1) {
    if (activeTopIndex === -1) {
      // Active is nested, over is top-level → move out of the column.
      const withoutActive = removeBlock(blocks, activeId);
      return insertTop(withoutActive, active, overTopIndex);
    }
    return moveArray(blocks, activeTopIndex, overTopIndex);
  }

  // Over a block inside a column → insert into that column at that block's index.
  if (overCol) {
    if (isRow) return blocks; // rows stay top-level
    const withoutActive = removeBlock(blocks, activeId);
    const idx = overCol.column.blocks.findIndex((b) => b.id === overId);
    // If the active lived in the same column we don't reach here (handled above).
    return insertIntoColumn(withoutActive, overCol.columnId, active, idx);
  }

  // Over an empty column droppable → append to that column.
  if (overColData) {
    if (isRow) return blocks;
    const withoutActive = removeBlock(blocks, activeId);
    return insertIntoColumn(withoutActive, overColData.id, active);
  }

  return blocks;
}

/**
 * Drop a freshly created block (from the palette) at the location under `overId`.
 * Rows always go to the top level.
 */
export function addBlockFromPalette(blocks: Block[], block: Block, overId?: string): Block[] {
  if (isRowBlock(block)) {
    return insertTop(blocks, block, blocks.length);
  }
  if (!overId) {
    return insertTop(blocks, block, blocks.length);
  }
  const overTopIndex = blocks.findIndex((b) => b.id === overId);
  if (overTopIndex !== -1) {
    return insertTop(blocks, block, overTopIndex + 1);
  }
  const overCol = findColumnForBlock(blocks, overId);
  if (overCol) {
    const idx = overCol.column.blocks.findIndex((b) => b.id === overId);
    return insertIntoColumn(blocks, overCol.columnId, block, idx + 1);
  }
  const col = columnById(blocks, overId);
  if (col) {
    return insertIntoColumn(blocks, col.id, block);
  }
  return insertTop(blocks, block, blocks.length);
}

export function allBlockIds(blocks: Block[]): string[] {
  const ids: string[] = [];
  for (const b of blocks) {
    ids.push(b.id);
    if (isRowBlock(b)) {
      for (const col of b.props.columns) {
        ids.push(col.id);
        for (const c of col.blocks) ids.push(c.id);
      }
    }
  }
  return ids;
}
import {
  isRowBlock,
  isSectionBlock,
  type Block,
  type ColumnData,
  type RowBlock,
  type SectionBlock,
} from "./types";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function moveArray<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Map every block in the tree (rows and sections included) through `fn`, keeping structure. */
export function mapBlocks(blocks: Block[], fn: (b: Block) => Block): Block[] {
  return blocks.map((b) => {
    if (isSectionBlock(b)) {
      return fn({
        ...b,
        props: {
          ...b.props,
          rows: b.props.rows.map((row) =>
            fn({
              ...row,
              props: {
                ...row.props,
                columns: row.props.columns.map((col) => ({
                  ...col,
                  blocks: mapBlocks(col.blocks, fn),
                })),
              },
            }) as Block,
          ),
        },
      } as Block);
    }
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

/** Get all rows from the page, including those nested inside sections. */
function allRows(blocks: Block[]): RowBlock[] {
  const rows: RowBlock[] = [];
  for (const b of blocks) {
    if (isRowBlock(b)) rows.push(b);
    if (isSectionBlock(b)) {
      for (const row of b.props.rows) rows.push(row);
    }
  }
  return rows;
}

export function findBlock(blocks: Block[], blockId: string): Block | null {
  for (const b of blocks) {
    if (b.id === blockId) return b;
    if (isSectionBlock(b)) {
      for (const row of b.props.rows) {
        if (row.id === blockId) return row;
        for (const col of row.props.columns) {
          const found = col.blocks.find((c) => c.id === blockId);
          if (found) return found;
        }
      }
    }
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
    if (isSectionBlock(b)) {
      for (const row of b.props.rows) {
        const col = row.props.columns.find((c) => c.id === columnId);
        if (col) return col;
      }
    }
    if (isRowBlock(b)) {
      const col = b.props.columns.find((c) => c.id === columnId);
      if (col) return col;
    }
  }
  return null;
}

export function rowIdForColumn(blocks: Block[], columnId: string): string | null {
  for (const b of blocks) {
    if (isSectionBlock(b)) {
      for (const row of b.props.rows) {
        if (row.props.columns.some((c) => c.id === columnId)) return row.id;
      }
    }
    if (isRowBlock(b)) {
      if (b.props.columns.some((c) => c.id === columnId)) return b.id;
    }
  }
  return null;
}

/**
 * Remove a column from a row. The row is kept even if it ends up with one column;
 * callers guard against removing the last column.
 */
export function removeColumnFromRow(
  blocks: Block[],
  rowId: string,
  columnId: string,
): Block[] {
  return mapBlocks(blocks, (b) => {
    if (!isRowBlock(b) || b.id !== rowId) return b;
    return {
      ...b,
      props: {
        ...b.props,
        columns: b.props.columns.filter((c) => c.id !== columnId),
      },
    } as Block;
  });
}

/**
 * Duplicate a column inside its row, inserting the copy right after the
 * original. The copy keeps the original widths/background and gets a fresh
 * column id plus fresh ids for every nested block. No-op if the column or its
 * row can't be found, or if the row is already at the column limit.
 */
export function duplicateColumn(
  blocks: Block[],
  rowId: string,
  columnId: string,
  limit = 6,
  newId?: string,
): Block[] {
  let found = false;
  const next = mapBlocks(blocks, (b) => {
    if (!isRowBlock(b) || b.id !== rowId) return b;
    if (b.props.columns.length >= limit) return b;
    const idx = b.props.columns.findIndex((c) => c.id === columnId);
    if (idx === -1) return b;
    found = true;
    const original = b.props.columns[idx];
    const copy: ColumnData = {
      ...original,
      id: newId ?? crypto.randomUUID(),
      blocks: original.blocks.map((child) => cloneBlock(child)),
    };
    const columns = [...b.props.columns];
    columns.splice(idx + 1, 0, copy);
    return { ...b, props: { ...b.props, columns } } as Block;
  });
  return found ? next : blocks;
}

/**
 * Update the settings of a single column inside a row (width, background, etc.).
 * Returns a new blocks tree, or the original if the column isn't found.
 */
export function updateColumnProps(
  blocks: Block[],
  columnId: string,
  patch: Partial<ColumnData>,
): Block[] {
  let found = false;
  const next = mapBlocks(blocks, (b) => {
    if (!isRowBlock(b)) return b;
    return {
      ...b,
      props: {
        ...b.props,
        columns: b.props.columns.map((col) => {
          if (col.id !== columnId) return col;
          found = true;
          return { ...col, ...patch };
        }),
      },
    } as Block;
  });
  return found ? next : blocks;
}

/** The column (if any) that currently holds `blockId`. */
export function findColumnForBlock(
  blocks: Block[],
  blockId: string,
): { rowId: string; columnId: string; column: ColumnData } | null {
  for (const b of blocks) {
    if (isSectionBlock(b)) {
      for (const row of b.props.rows) {
        for (const col of row.props.columns) {
          if (col.blocks.some((c) => c.id === blockId)) {
            return { rowId: row.id, columnId: col.id, column: col };
          }
        }
      }
    }
    if (isRowBlock(b)) {
      for (const col of b.props.columns) {
        if (col.blocks.some((c) => c.id === blockId)) {
          return { rowId: b.id, columnId: col.id, column: col };
        }
      }
    }
  }
  return null;
}

export function updateBlockProps(blocks: Block[], id: string, props: Block["props"]): Block[] {
  return mapBlocks(blocks, (b) => (b.id === id ? ({ ...b, props } as Block) : b));
}

/** Deep-clone a block with fresh ids for itself and any nested structure. */
export function cloneBlock(block: Block): Block {
  if (isSectionBlock(block)) {
    return {
      ...block,
      id: crypto.randomUUID(),
      props: {
        ...block.props,
        rows: block.props.rows.map((row) => ({
          ...row,
          id: crypto.randomUUID(),
          props: {
            ...row.props,
            columns: row.props.columns.map((col) => ({
              ...col,
              id: crypto.randomUUID(),
              blocks: col.blocks.map((child) => cloneBlock(child)),
            })),
          },
        })) as RowBlock[],
      },
    } as Block;
  }
  if (isRowBlock(block)) {
    return {
      ...block,
      id: crypto.randomUUID(),
      props: {
        ...block.props,
        columns: block.props.columns.map((col) => ({
          ...col,
          id: crypto.randomUUID(),
          blocks: col.blocks.map((child) => cloneBlock(child)),
        })),
      },
    } as Block;
  }
  return { ...block, id: crypto.randomUUID(), props: structuredClone(block.props) } as Block;
}

/** Insert a copy of `id` right after the original (top level or inside its column/section). */
export function duplicateBlock(blocks: Block[], id: string): Block[] {
  const target = findBlock(blocks, id);
  if (!target) return blocks;
  const copy = cloneBlock(target);

  const topIndex = blocks.findIndex((b) => b.id === id);
  if (topIndex !== -1) {
    const next = [...blocks];
    next.splice(topIndex + 1, 0, copy);
    return next;
  }

  const column = findColumnForBlock(blocks, id);
  if (!column) return blocks;

  return mapBlocks(blocks, (b) => {
    if (!isRowBlock(b)) return b;
    return {
      ...b,
      props: {
        ...b.props,
        columns: b.props.columns.map((col) => {
          if (col.id !== column.columnId) return col;
          const idx = col.blocks.findIndex((x) => x.id === id);
          if (idx === -1) return col;
          const next = [...col.blocks];
          next.splice(idx + 1, 0, copy);
          return { ...col, blocks: next };
        }),
      },
    } as Block;
  });
}

/** Replace a block in place (kept for conversions where the id should be preserved). */
export function replaceBlock(blocks: Block[], id: string, next: Block): Block[] {
  const topIndex = blocks.findIndex((b) => b.id === id);
  if (topIndex !== -1) {
    const arr = [...blocks];
    arr[topIndex] = next;
    return arr;
  }
  return mapBlocks(blocks, (b) => {
    if (!isRowBlock(b)) return b;
    return {
      ...b,
      props: {
        ...b.props,
        columns: b.props.columns.map((col) => ({
          ...col,
          blocks: col.blocks.map((x) => (x.id === id ? next : x)),
        })),
      },
    } as Block;
  });
}

/** Flat visual ordering of all blocks (used for keyboard navigation). */
export function flattenIds(blocks: Block[]): string[] {
  const ids: string[] = [];
  for (const b of blocks) {
    ids.push(b.id);
    if (isSectionBlock(b)) {
      for (const row of b.props.rows) {
        ids.push(row.id);
        for (const col of row.props.columns) {
          for (const child of col.blocks) ids.push(child.id);
        }
      }
    }
    if (isRowBlock(b)) {
      for (const col of b.props.columns) {
        for (const child of col.blocks) ids.push(child.id);
      }
    }
  }
  return ids;
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  const next: Block[] = [];
  for (const b of blocks) {
    if (b.id === id) continue;
    if (isSectionBlock(b)) {
      const updatedRows = b.props.rows
        .filter((row) => row.id !== id)
        .map((row) => ({
          ...row,
          props: {
            ...row.props,
            columns: row.props.columns.map((col) => ({
              ...col,
              blocks: col.blocks.filter((c) => c.id !== id),
            })),
          },
        })) as RowBlock[];
      next.push({ ...b, props: { ...b.props, rows: updatedRows } } as Block);
    } else if (isRowBlock(b)) {
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
 * - top level -> a section (as a row)
 * - section row <-> section row (reorder)
 * - section row -> top level
 * Rows always stay at the top level or inside a section.
 */
export function moveBlock(blocks: Block[], activeId: string, overId: string): Block[] {
  if (activeId === overId) return blocks;

  const active = findBlock(blocks, activeId);
  if (!active) return blocks;

  const activeTopIndex = blocks.findIndex((b) => b.id === activeId);
  const activeCol = findColumnForBlock(blocks, activeId);
  const activeSectionIndex = blocks.findIndex(
    (b) => isSectionBlock(b) && b.props.rows.some((r) => r.id === activeId),
  );
  const isRow = isRowBlock(active);

  const overTopIndex = blocks.findIndex((b) => b.id === overId);
  const overCol = findColumnForBlock(blocks, overId);
  const overColData = columnById(blocks, overId);
  const overSectionIndex = blocks.findIndex(
    (b) => isSectionBlock(b) && b.props.rows.some((r) => r.id === overId),
  );

  // Same column reorder.
  if (activeCol && overCol && activeCol.columnId === overCol.columnId) {
    return reorderInColumn(blocks, activeCol.columnId, activeId, overId);
  }
  // Dropped onto its own column — no-op.
  if (activeCol && overColData && overColData.id === activeCol.columnId) {
    return blocks;
  }

  // Top-level reorder (rows, sections, and leaves).
  if (overTopIndex !== -1) {
    if (activeTopIndex === -1) {
      // Active is nested (in section or column), over is top-level → move out.
      const withoutActive = removeBlock(blocks, activeId);
      return insertTop(withoutActive, active, overTopIndex);
    }
    return moveArray(blocks, activeTopIndex, overTopIndex);
  }

  // Active is a row inside a section, over is a row in the same section → reorder.
  if (activeSectionIndex !== -1 && overSectionIndex !== -1 && activeSectionIndex === overSectionIndex) {
    const section = blocks[activeSectionIndex] as SectionBlock;
    const from = section.props.rows.findIndex((r) => r.id === activeId);
    const to = section.props.rows.findIndex((r) => r.id === overId);
    if (from === -1 || to === -1) return blocks;
    const updatedSection = {
      ...section,
      props: { ...section.props, rows: moveArray(section.props.rows, from, to) },
    } as Block;
    const next = [...blocks];
    next[activeSectionIndex] = updatedSection;
    return next;
  }

  // Over a block inside a column → insert into that column at that block's index.
  if (overCol) {
    if (isRow) return blocks; // rows stay at top level or in sections
    const withoutActive = removeBlock(blocks, activeId);
    const idx = overCol.column.blocks.findIndex((b) => b.id === overId);
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
 * Rows always go to the top level. Sections go to the top level.
 */
export function addBlockFromPalette(blocks: Block[], block: Block, overId?: string): Block[] {
  if (isRowBlock(block) || isSectionBlock(block)) {
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
    if (isSectionBlock(b)) {
      for (const row of b.props.rows) {
        ids.push(row.id);
        for (const col of row.props.columns) {
          ids.push(col.id);
          for (const c of col.blocks) ids.push(c.id);
        }
      }
    }
    if (isRowBlock(b)) {
      for (const col of b.props.columns) {
        ids.push(col.id);
        for (const c of col.blocks) ids.push(c.id);
      }
    }
  }
  return ids;
}

/** Add a row to a section. Returns new blocks tree. */
export function addRowToSection(blocks: Block[], sectionId: string, row: RowBlock): Block[] {
  return blocks.map((b) => {
    if (!isSectionBlock(b) || b.id !== sectionId) return b;
    return {
      ...b,
      props: { ...b.props, rows: [...b.props.rows, row] },
    } as Block;
  });
}

/** Remove a row from a section. Returns new blocks tree. */
export function removeRowFromSection(blocks: Block[], sectionId: string, rowId: string): Block[] {
  return blocks.map((b) => {
    if (!isSectionBlock(b) || b.id !== sectionId) return b;
    return {
      ...b,
      props: { ...b.props, rows: b.props.rows.filter((r) => r.id !== rowId) },
    } as Block;
  });
}

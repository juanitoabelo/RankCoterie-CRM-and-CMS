"use client";

import { useCallback, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Block, ColumnData, RowBlock, SectionBlock } from "@/lib/page-builder/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { createSingleColumnRow, createLayoutBlock, type HeaderFooterBlockType } from "@/lib/page-builder/types";
import { RenderBlocks } from "./HeaderFooterRenderer";
import { blockIcon, blockLabel } from "@/components/admin/visual-editor/labels";

interface LayoutEditorProps {
  /** Root blocks (sections/rows/blocks) to edit. */
  blocks: Block[];
  /** Called when the block tree changes. */
  onChange: (blocks: Block[]) => void;
  /** Unique prefix for droppable IDs. */
  droppablePrefix: string;
  /** Optional label for the editor. */
  label?: string;
  /** Optional description. */
  description?: string;
  /** Show "add section/row" buttons at top level. */
  allowTopLevelLayout?: boolean;
}

/**
 * A simplified layout editor for nested content (mobile panel, dropdown panels).
 * Renders a block tree (sections/rows/columns/blocks) with drop zones for
 * adding/removing/reordering sections, rows, and blocks.
 */
export default function LayoutEditor({
  blocks,
  onChange,
  droppablePrefix,
  label,
  description,
  allowTopLevelLayout = true,
}: LayoutEditorProps) {
  // Sections start expanded so drop targets are immediately visible.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Root drop zone — makes the whole editor accept drops (incl. empty trees).
  const { setNodeRef: setRootRef, isOver: isOverRoot } = useDroppable({ id: `${droppablePrefix}:root` });

  // --- Mutations ---

  const addBlockAt = useCallback(
    (parentId: string | null, index: number, type: HeaderFooterBlockType) => {
      const newBlock = createLayoutBlock(type) as unknown as Block;
      onChange(
        updateTree(blocks, (b) => {
          if (b.id === parentId) {
            if (isSectionBlock(b)) {
              // Can't add blocks directly to section - need row first
              return b;
            }
            if (isRowBlock(b)) {
              // Add to first column or create one
              const cols = b.props.columns;
              if (cols.length === 0) {
                return { ...b, props: { ...b.props, columns: [{ id: crypto.randomUUID(), span: 12, blocks: [newBlock] }] } } as Block;
              }
              const newCols = cols.map((c, i) =>
                i === 0 ? { ...c, blocks: [...c.blocks.slice(0, index), newBlock, ...c.blocks.slice(index)] } : c,
              );
              return { ...b, props: { ...b.props, columns: newCols } } as Block;
            }
          }
          return b;
        }),
      );
    },
    [blocks, onChange],
  );

  const addSection = useCallback(() => {
    const section = createLayoutBlock("section") as SectionBlock;
    onChange([...blocks, section]);
  }, [blocks, onChange]);

  const addRow = useCallback(
    (sectionId: string) => {
      onChange(
        updateTree(blocks, (b) => {
          if (b.id === sectionId && isSectionBlock(b)) {
            const row = createSingleColumnRow() as RowBlock;
            return { ...b, props: { ...b.props, rows: [...b.props.rows, row] } } as Block;
          }
          return b;
        }),
      );
    },
    [blocks, onChange],
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      onChange(removeFromTree(blocks, blockId));
    },
    [blocks, onChange],
  );

  const reorderInColumn = useCallback(
    (columnId: string, from: number, to: number) => {
      onChange(
        updateTree(blocks, (b) => {
          if (isRowBlock(b)) {
            const col = b.props.columns.find((c) => c.id === columnId);
            if (col) {
              const newBlocks = [...col.blocks];
              const [moved] = newBlocks.splice(from, 1);
              newBlocks.splice(to, 0, moved);
              const newCols = b.props.columns.map((c) => (c.id === columnId ? { ...c, blocks: newBlocks } : c));
              return { ...b, props: { ...b.props, columns: newCols } } as Block;
            }
          }
          return b;
        }),
      );
    },
    [blocks, onChange],
  );

  // --- Render ---

  return (
    <div className="space-y-3">
      {label && (
        <>
          <span className="text-xs font-semibold text-zinc-700">{label}</span>
          {description && <p className="mt-1 text-[11px] leading-4 text-zinc-500">{description}</p>}
        </>
      )}

      {allowTopLevelLayout && (
        <div className="flex flex-wrap gap-2 mb-3 p-2 rounded border border-dashed border-zinc-300 bg-zinc-50/50">
          <span className="text-[10px] text-zinc-500 self-center mr-1">Add layout:</span>
          <button type="button" onClick={addSection} className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100">
            + Section
          </button>
        </div>
      )}

      <div
        ref={setRootRef}
        className={`space-y-2 rounded-lg border-2 p-2 transition-colors ${
          isOverRoot ? "border-blue-400 bg-blue-50/60" : "border-transparent"
        }`}
      >
        {blocks.map((block, idx) => (
          <LayoutNode
            key={block.id}
            block={block}
            index={idx}
            parentId={null}
            droppablePrefix={droppablePrefix}
            onAddBlock={addBlockAt}
            onRemoveBlock={removeBlock}
            onReorderInColumn={reorderInColumn}
            onAddRow={addRow}
            onSelect={() => toggleSection(block.id)}
            isEditing={!collapsed.has(block.id)}
            onChange={onChange}
          />
        ))}

        {blocks.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center text-[11px] text-zinc-400">
            {isOverRoot ? "Drop here" : "Empty — drag blocks here or add a section to start"}
          </div>
        )}
      </div>
    </div>
  );
}

/** Recursively render a block tree node (section/row/column/block). */
function LayoutNode({
  block,
  index,
  parentId,
  droppablePrefix,
  onAddBlock,
  onRemoveBlock,
  onReorderInColumn,
  onAddRow,
  onSelect,
  isEditing,
  onChange,
}: {
  block: Block;
  index: number;
  parentId: string | null;
  droppablePrefix: string;
  onAddBlock: (parentId: string | null, index: number, type: HeaderFooterBlockType) => void;
  onRemoveBlock: (blockId: string) => void;
  onReorderInColumn: (columnId: string, from: number, to: number) => void;
  onAddRow: (sectionId: string) => void;
  onSelect: () => void;
  isEditing: boolean;
  onChange: (blocks: Block[]) => void;
}) {
  const props = block.props as Record<string, unknown>;

  // Section
  if (isSectionBlock(block)) {
    const sectionId = block.id;
    const rows = (props.rows as RowBlock[]) ?? [];
    return (
      <div className="rounded border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs">{blockIcon(block.type)}</span>
            <span className="text-xs font-medium text-zinc-700">{blockLabel(block.type)}</span>
            <span className="text-[10px] text-zinc-400">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onAddRow(sectionId)} className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-100" title="Add row">+ Row</button>
            <button onClick={onSelect} className={`rounded px-1.5 py-0.5 text-[10px] ${isEditing ? "bg-blue-100 text-blue-700" : "text-zinc-500 hover:bg-zinc-100"}`} title={isEditing ? "Collapse" : "Edit"}>
              {isEditing ? "−" : "✎"}
            </button>
            <button onClick={() => onRemoveBlock(block.id)} className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50" title="Remove">✕</button>
          </div>
        </div>

        {isEditing && (
          <div className="p-3 space-y-2">
            {rows.map((row, rowIdx) => (
              <LayoutNode
                key={row.id}
                block={row}
                index={rowIdx}
                parentId={sectionId}
                droppablePrefix={droppablePrefix}
                onAddBlock={onAddBlock}
                onRemoveBlock={onRemoveBlock}
                onReorderInColumn={onReorderInColumn}
                onAddRow={onAddRow}
                onSelect={onSelect}
                isEditing={true}
                onChange={onChange}
              />
            ))}

            {rows.length === 0 && (
              <div className="text-center py-4 text-[11px] text-zinc-400 border-2 border-dashed border-zinc-300 rounded">
                No rows — click "Add row" above
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Row
  if (isRowBlock(block)) {
    const rowId = block.id;
    const columns = (props.columns as ColumnData[]) ?? [];
    return (
      <div className="rounded border border-zinc-200 bg-white ml-3">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs">{blockIcon(block.type)}</span>
            <span className="text-xs font-medium text-zinc-700">{blockLabel(block.type)}</span>
            <span className="text-[10px] text-zinc-400">{columns.length} col{columns.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onRemoveBlock(block.id)} className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50" title="Remove row">✕</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 p-3">
          {columns.map((col, colIdx) => {
            return (
              <div key={col.id} style={{ gridColumn: `span ${col.span}` }} className="min-h-[60px] relative">
                <ColumnDropZone
                  column={col}
                  columnIndex={colIdx}
                  droppablePrefix={droppablePrefix}
                  onAddBlock={(type, idx) => onAddBlock(col.id, idx, type)}
                  onReorder={(from, to) => onReorderInColumn(col.id, from, to)}
                  onChange={onChange}
                >
                  {col.blocks.map((childBlock, childIdx) => (
                    <BlockNode
                      key={childBlock.id}
                      block={childBlock}
                      index={childIdx}
                      columnId={col.id}
                      droppablePrefix={droppablePrefix}
                      onRemove={() => onRemoveBlock(childBlock.id)}
                      onMove={(dir) => onReorderInColumn(col.id, childIdx, childIdx + dir)}
                      onSelect={() => onSelect()}
                    />
                  ))}
                </ColumnDropZone>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Leaf block
  return (
    <BlockNode
      block={block}
      index={index}
      columnId={parentId}
      droppablePrefix={droppablePrefix}
      onRemove={() => onRemoveBlock(block.id)}
      onMove={(dir) => onReorderInColumn(parentId!, index, index + dir)}
      onSelect={onSelect}
    />
  );
}

/** Drop zone for a column - accepts blocks. */
function ColumnDropZone({
  column,
  columnIndex,
  droppablePrefix,
  onAddBlock,
  onReorder,
  onChange,
  children,
}: {
  column: ColumnData;
  columnIndex: number;
  droppablePrefix: string;
  onAddBlock: (type: HeaderFooterBlockType, index: number) => void;
  onReorder: (from: number, to: number) => void;
  onChange: (blocks: Block[]) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${droppablePrefix}:col:${column.id}` });

  return (
    <div ref={setNodeRef} className={`relative min-h-[60px] rounded border-2 transition-colors ${isOver ? "border-blue-400 bg-blue-50/60" : "border-transparent"}`}>
      {children}
      {column.blocks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400 pointer-events-none">
          Drop blocks here
        </div>
      )}
    </div>
  );
}

/** Individual block node with remove/move/select. */
function BlockNode({
  block,
  index,
  columnId,
  droppablePrefix,
  onRemove,
  onMove,
  onSelect,
}: {
  block: Block;
  index: number;
  columnId: string;
  droppablePrefix: string;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onSelect: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-zinc-200 bg-white mb-2">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-zinc-50/50 border-b border-zinc-100">
        <span className="text-xs">{blockIcon(block.type)}</span>
        <span className="flex-1 truncate text-[11px] font-medium text-zinc-700">{blockLabel(block.type)}</span>
        <button onClick={() => onMove(-1)} disabled={index === 0} className="rounded px-1.5 text-[10px] text-zinc-500 hover:bg-zinc-100 disabled:opacity-30" title="Move up">↑</button>
        <button onClick={() => onMove(1)} className="rounded px-1.5 text-[10px] text-zinc-500 hover:bg-zinc-100" title="Move down">↓</button>
        <button onClick={onSelect} className="rounded px-1.5 text-[10px] text-zinc-500 hover:bg-zinc-100" title="Select on canvas">✎</button>
        <button onClick={onRemove} className="rounded px-1.5 text-[10px] text-red-500 hover:bg-red-50" title="Remove">✕</button>
      </div>
      {open && (
        <div className="p-2 border-t border-zinc-100 text-[11px] text-zinc-500">
          Block ID: {block.id}<br />
          Type: {block.type}
        </div>
      )}
    </div>
  );
}

/** Tree update helpers */
function updateTree(blocks: Block[], fn: (block: Block) => Block): Block[] {
  return blocks.map((b) => {
    const updated = fn(b);
    if (updated !== b) return updated;
    const p = updated.props as Record<string, unknown>;
    if (isSectionBlock(updated)) {
      return { ...updated, props: { ...p, rows: updateTree((p.rows as Block[]) ?? [], fn) } };
    }
    if (isRowBlock(updated)) {
      const cols = (p.columns as ColumnData[]) ?? [];
      const newCols = cols.map((c) => ({ ...c, blocks: updateTree(c.blocks ?? [], fn) }));
      return { ...updated, props: { ...p, columns: newCols } };
    }
    return updated;
  });
}

function removeFromTree(blocks: Block[], targetId: string): Block[] {
  return blocks
    .filter((b) => b.id !== targetId)
    .map((b) => {
      const p = b.props as Record<string, unknown>;
      if (isSectionBlock(b)) {
        return { ...b, props: { ...p, rows: removeFromTree((p.rows as Block[]) ?? [], targetId) } };
      }
      if (isRowBlock(b)) {
        const cols = ((p.columns as ColumnData[]) ?? []).map((c) => ({ ...c, blocks: removeFromTree(c.blocks ?? [], targetId) }));
        return { ...b, props: { ...p, columns: cols } };
      }
      return b;
    });
}
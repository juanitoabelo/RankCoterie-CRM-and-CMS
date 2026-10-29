"use client";

import { useCallback, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Block, ColumnData, RowBlock, SectionBlock } from "@/lib/page-builder/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { createSingleColumnRow, createLayoutBlock, type HeaderFooterBlockType } from "@/lib/page-builder/types";
import { RenderBlocks } from "./HeaderFooterRenderer";
import { blockIcon, blockLabel } from "@/components/admin/visual-editor/labels";
import { resolveColumnWidths, canvasColumnSpanClass } from "@/lib/page-builder/spans";

type Viewport = "desktop" | "tablet" | "mobile";

/** Width presets as a percentage of the row width (12-column grid). */
const WIDTH_PRESETS: Array<{ label: string; span: number }> = [
  { label: "100%", span: 12 },
  { label: "75%", span: 9 },
  { label: "66%", span: 8 },
  { label: "50%", span: 6 },
  { label: "33%", span: 4 },
  { label: "25%", span: 3 },
];

const VIEWPORTS: Array<{ id: Viewport; label: string; short: string }> = [
  { id: "desktop", label: "Desktop", short: "D" },
  { id: "tablet", label: "Tablet", short: "T" },
  { id: "mobile", label: "Mobile", short: "M" },
];

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
  // Which breakpoint the width controls edit / the preview renders.
  const [viewport, setViewport] = useState<Viewport>("desktop");
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

  const addTopLevelRow = useCallback(() => {
    onChange([...blocks, createSingleColumnRow() as RowBlock]);
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

  /** Set a column's width (1–12) for the active breakpoint. */
  const setColumnWidth = useCallback(
    (rowId: string, colId: string, span: number) => {
      const key = viewport === "desktop" ? "span" : viewport === "tablet" ? "spanMd" : "spanSm";
      onChange(
        updateTree(blocks, (b) => {
          if (b.id !== rowId || !isRowBlock(b)) return b;
          const cols = (b.props.columns as ColumnData[]) ?? [];
          return {
            ...b,
            props: {
              ...b.props,
              columns: cols.map((c) => (c.id === colId ? ({ ...c, [key]: span } as ColumnData) : c)),
            },
          } as Block;
        }),
      );
    },
    [blocks, onChange, viewport],
  );

  /** Clear a tablet/mobile override so the column falls back to the default. */
  const resetColumnWidth = useCallback(
    (rowId: string, colId: string) => {
      onChange(
        updateTree(blocks, (b) => {
          if (b.id !== rowId || !isRowBlock(b)) return b;
          const cols = (b.props.columns as ColumnData[]) ?? [];
          return {
            ...b,
            props: {
              ...b.props,
              columns: cols.map((c) => {
                if (c.id !== colId) return c;
                const next = { ...c };
                if (viewport === "tablet") next.spanMd = undefined;
                else next.spanSm = undefined;
                return next;
              }),
            },
          } as Block;
        }),
      );
    },
    [blocks, onChange, viewport],
  );

  /** Add a column, re-splitting the row to equal widths across the 12-col grid. */
  const addColumn = useCallback(
    (rowId: string) => {
      onChange(
        updateTree(blocks, (b) => {
          if (b.id !== rowId || !isRowBlock(b)) return b;
          const cols = (b.props.columns as ColumnData[]) ?? [];
          const count = cols.length + 1;
          const base = Math.floor(12 / count);
          let remainder = 12 - base * count;
          const nextSpan = () => (remainder-- > 0 ? base + 1 : base);
          return {
            ...b,
            props: {
              ...b.props,
              columns: [
                ...cols.map((c) => ({ ...c, span: nextSpan(), spanMd: undefined, spanSm: undefined })),
                { id: crypto.randomUUID(), span: nextSpan(), blocks: [] } as ColumnData,
              ],
            },
          } as Block;
        }),
      );
    },
    [blocks, onChange],
  );

  /** Remove a column (and its blocks). Disabled by the UI when it is the only column. */
  const removeColumn = useCallback(
    (rowId: string, colId: string) => {
      onChange(
        updateTree(blocks, (b) => {
          if (b.id !== rowId || !isRowBlock(b)) return b;
          const cols = (b.props.columns as ColumnData[]) ?? [];
          if (cols.length <= 1) return b;
          return {
            ...b,
            props: { ...b.props, columns: cols.filter((c) => c.id !== colId) },
          } as Block;
        }),
      );
    },
    [blocks, onChange],
  );

  /** Toggle "stack columns full-width on mobile". */
  const toggleStackOnMobile = useCallback(
    (rowId: string, value: boolean) => {
      onChange(
        updateTree(blocks, (b) => {
          if (b.id !== rowId || !isRowBlock(b)) return b;
          return { ...b, props: { ...b.props, stackOnMobile: value } } as Block;
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

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-2 py-1.5">
        <span className="text-[10px] text-zinc-500">
          Preview &amp; edit widths for:
        </span>
        <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white p-0.5" title="Choose which screen size the column width controls edit">
          {VIEWPORTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewport(v.id)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                viewport === v.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {allowTopLevelLayout && (
        <div className="flex flex-wrap gap-2 mb-3 p-2 rounded border border-dashed border-zinc-300 bg-zinc-50/50">
          <span className="text-[10px] text-zinc-500 self-center mr-1">Add layout:</span>
          <button type="button" onClick={addSection} className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100">
            + Section
          </button>
          <button type="button" onClick={addTopLevelRow} className="rounded border border-zinc-300 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100">
            + Row
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
            viewport={viewport}
            onAddBlock={addBlockAt}
            onRemoveBlock={removeBlock}
            onReorderInColumn={reorderInColumn}
            onAddRow={addRow}
            onSetColumnWidth={setColumnWidth}
            onResetColumnWidth={resetColumnWidth}
            onAddColumn={addColumn}
            onRemoveColumn={removeColumn}
            onToggleStack={toggleStackOnMobile}
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
  viewport,
  onAddBlock,
  onRemoveBlock,
  onReorderInColumn,
  onAddRow,
  onSetColumnWidth,
  onResetColumnWidth,
  onAddColumn,
  onRemoveColumn,
  onToggleStack,
  onSelect,
  isEditing,
  onChange,
}: {
  block: Block;
  index: number;
  parentId: string | null;
  droppablePrefix: string;
  viewport: Viewport;
  onAddBlock: (parentId: string | null, index: number, type: HeaderFooterBlockType) => void;
  onRemoveBlock: (blockId: string) => void;
  onReorderInColumn: (columnId: string, from: number, to: number) => void;
  onAddRow: (sectionId: string) => void;
  onSetColumnWidth: (rowId: string, colId: string, span: number) => void;
  onResetColumnWidth: (rowId: string, colId: string) => void;
  onAddColumn: (rowId: string) => void;
  onRemoveColumn: (rowId: string, colId: string) => void;
  onToggleStack: (rowId: string, value: boolean) => void;
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
                viewport={viewport}
                onAddBlock={onAddBlock}
                onRemoveBlock={onRemoveBlock}
                onReorderInColumn={onReorderInColumn}
                onAddRow={onAddRow}
                onSetColumnWidth={onSetColumnWidth}
                onResetColumnWidth={onResetColumnWidth}
                onAddColumn={onAddColumn}
                onRemoveColumn={onRemoveColumn}
                onToggleStack={onToggleStack}
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
    const stackOnMobile = Boolean(props.stackOnMobile);
    return (
      <div className="rounded border border-zinc-200 bg-white ml-3">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2">
            <span className="text-xs">{blockIcon(block.type)}</span>
            <span className="text-xs font-medium text-zinc-700">{blockLabel(block.type)}</span>
            <span className="text-[10px] text-zinc-400">{columns.length} col{columns.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onAddColumn(rowId)} className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-100" title="Add column (re-splits widths equally)">+ Col</button>
            <button
              onClick={() => onToggleStack(rowId, !stackOnMobile)}
              className={`rounded px-1.5 py-0.5 text-[10px] ${stackOnMobile ? "bg-emerald-100 text-emerald-700" : "text-zinc-500 hover:bg-zinc-100"}`}
              title="Stack columns full-width on mobile screens"
            >
              Stack
            </button>
            <button onClick={() => onRemoveBlock(block.id)} className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50" title="Remove row">✕</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2 p-3">
          {columns.map((col, colIdx) => {
            const widths = resolveColumnWidths(col, stackOnMobile);
            const spanClass = canvasColumnSpanClass(widths, viewport);
            return (
              <div key={col.id} className={`min-h-[60px] relative ${spanClass}`}>
                <ColumnWidthBar
                  column={col}
                  stackOnMobile={stackOnMobile}
                  viewport={viewport}
                  canRemove={columns.length > 1}
                  onSetWidth={(span) => onSetColumnWidth(rowId, col.id, span)}
                  onResetWidth={() => onResetColumnWidth(rowId, col.id)}
                  onRemove={() => onRemoveColumn(rowId, col.id)}
                />
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

/**
 * Per-column responsive width controls: percentage presets of the row width
 * plus an exact 1–12 grid input, applied to the active breakpoint
 * (desktop → span, tablet → spanMd, mobile → spanSm).
 */
function ColumnWidthBar({
  column,
  stackOnMobile,
  viewport,
  canRemove,
  onSetWidth,
  onResetWidth,
  onRemove,
}: {
  column: ColumnData;
  stackOnMobile: boolean;
  viewport: Viewport;
  canRemove: boolean;
  onSetWidth: (span: number) => void;
  onResetWidth: () => void;
  onRemove: () => void;
}) {
  const widths = resolveColumnWidths(column, stackOnMobile);
  const active = widths[viewport];
  const hasOverride =
    viewport === "tablet" ? column.spanMd != null : viewport === "mobile" ? column.spanSm != null : true;
  const vpShort = viewport === "desktop" ? "D" : viewport === "tablet" ? "T" : "M";

  const clamp = (n: number) => Math.min(12, Math.max(1, Math.round(n) || 1));

  return (
    <div className="mb-1 flex flex-wrap items-center gap-1 rounded border border-zinc-200 bg-zinc-50/70 px-1.5 py-1">
      <span
        className="rounded bg-white px-1 text-[8px] font-bold uppercase text-zinc-500 ring-1 ring-zinc-200"
        title={`${viewport} width (d/t/m = desktop/tablet/mobile)`}
      >
        {vpShort}
      </span>
      <span className="text-[9px] font-mono text-zinc-400" title="Desktop / Tablet / Mobile width">
        {widths.desktop}/{widths.tablet}/{widths.mobile}
      </span>
      <div className="flex flex-wrap gap-0.5">
        {WIDTH_PRESETS.map((p) => (
          <button
            key={p.span}
            type="button"
            onClick={() => onSetWidth(p.span)}
            title={`${p.label} of the row width on ${viewport}`}
            className={`rounded px-1 py-0.5 text-[9px] font-medium leading-none transition-colors ${
              active === p.span
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={1}
        max={12}
        value={active}
        onChange={(e) => onSetWidth(clamp(Number(e.target.value)))}
        className="w-9 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center text-[10px]"
        title="Exact width in the 12-column grid (1-12)"
      />
      {viewport !== "desktop" && hasOverride && (
        <button
          type="button"
          onClick={onResetWidth}
          className="rounded px-1 text-[10px] text-zinc-400 hover:bg-white hover:text-zinc-600"
          title={viewport === "tablet" ? "Follow desktop width" : "Follow stack-on-mobile / desktop width"}
        >
          ↺
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="ml-auto rounded px-1 text-[10px] text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-25"
        title={canRemove ? "Remove this column" : "A row needs at least one column"}
      >
        ✕
      </button>
    </div>
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
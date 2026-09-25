"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Block } from "@/lib/page-builder/types";
import { findBlock } from "@/lib/page-builder/tree";
import { PB_CONTAINER, PB_EL_ATTR, PB_KIND_ATTR } from "./constants";
import { blockIcon, blockLabel, kindLabel } from "./labels";
import { enableInlineTextEdit, resolveEditableFields } from "./InlineTextEditing";
import { useElementGeometry, type PbRect } from "./useElementGeometry";

/* ── Tree metadata ──────────────────────────────────────────────────────── */

export interface PbMeta {
  id: string;
  kind: "section" | "row" | "column" | "block";
  type?: string;
  columns?: number;
}

function collectElementMeta(blocks: Block[]): PbMeta[] {
  const out: PbMeta[] = [];
  const walk = (list: Block[]) => {
    for (const b of list) {
      const p = b.props as Record<string, any>;
      if (b.type === "section") {
        out.push({ id: b.id, kind: "section", type: "section", columns: p.rows?.length ?? 0 });
        for (const row of p.rows ?? []) {
          out.push({ id: row.id, kind: "row", type: "row", columns: row.props?.columns?.length ?? 0 });
          for (const col of row.props?.columns ?? []) {
            out.push({ id: col.id, kind: "column" });
            walk(col.blocks ?? []);
          }
        }
      } else if (b.type === "row") {
        out.push({ id: b.id, kind: "row", type: "row", columns: p.columns?.length ?? 0 });
        for (const col of p.columns ?? []) {
          out.push({ id: col.id, kind: "column" });
          walk(col.blocks ?? []);
        }
      } else {
        out.push({ id: b.id, kind: "block", type: b.type });
      }
    }
  };
  walk(blocks);
  return out;
}

/* ── Canvas CSS (outlines injected via attributes, scoped to this canvas) ── */

const VeCss = `
.ve-canvas [data-pb-el][data-pb-hover]:not([data-pb-selected]){outline:1.5px solid #0ea5e9;outline-offset:1px;}
.ve-canvas [data-pb-el][data-pb-selected]{outline:2px solid #f59e0b;outline-offset:1px;}
.ve-canvas [data-pb-el][data-pb-editing]{outline:2px solid #6366f1;outline-offset:1px;}
`;

/* ── Props ──────────────────────────────────────────────────────────────── */

interface Props {
  blocks: Block[];
  renderLive: React.ReactNode;
  emptyHint?: string;
  selectedId: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string | null) => void;
  onSelectColumn: (columnId: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onAddRowToSection?: (sectionId: string) => void;
  onEditText?: (id: string, props: Record<string, unknown>) => void;
}

/* ── Editable anchor (droppable, invisible) ─────────────────────────────── */

function Anchor({ id, rect }: { id: string; rect: PbRect }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      data-pb-canvas-ui
      className="pointer-events-none absolute z-10"
      style={{
        left: rect.left - 1,
        top: rect.top - 1,
        width: Math.max(rect.width, 4) + 2,
        height: Math.max(rect.height, 4) + 2,
        boxShadow: isOver ? "0 0 0 2px rgba(59,130,246,0.45), inset 0 0 0 2px rgba(59,130,246,0.45)" : undefined,
        borderRadius: 2,
      }}
    />
  );
}

/* ── Floating toolbar (drag / pencil / row / move / dup / delete) ───────── */

function Toolbar({
  id,
  rect,
  meta,
  canEditText,
  canAddRow,
  onEdit,
  onRemove,
  onDuplicate,
  onMove,
  onAddRowToSection,
}: {
  id: string;
  rect: PbRect;
  meta: PbMeta;
  canEditText: boolean;
  canAddRow: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  onAddRowToSection: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const label =
    meta.kind === "block"
      ? blockLabel(meta.type ?? "", "Block")
      : kindLabel(meta.kind, meta.columns !== undefined ? `${meta.columns} col` : undefined);

  const width = 194;
  const left = Math.max(4, Math.min(rect.left, rect.left + rect.width / 2 - width / 2));
  const top = rect.top - 38 < 4 ? rect.top + rect.height + 4 : rect.top - 38;

  const btn =
    "flex h-7 w-7 items-center justify-center rounded text-[13px] text-white transition-colors hover:bg-white/20 disabled:opacity-30";

  return (
    <div
      data-pb-canvas-ui
      className="absolute z-30"
      style={{ left, top, transform: CSS.Translate.toString(transform) }}
    >
      <div className="flex items-center rounded-md bg-zinc-900/95 px-1 py-1 shadow-lg ring-1 ring-white/20">
        <button
          type="button"
          {...listeners}
          {...attributes}
          title="Drag to reorder"
          aria-label="Drag to reorder"
          className={`${btn} cursor-grab active:cursor-grabbing`}
        >
          ⠿
        </button>
        <span className="mx-1 max-w-[120px] truncate text-[10px] font-medium uppercase tracking-wide text-zinc-300">
          {label}
        </span>
        {canEditText && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit();
            }}
            title="Edit text inline"
            aria-label="Edit text inline"
            className={btn}
          >
            ✎
          </button>
        )}
        {canAddRow && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddRowToSection();
            }}
            title="Add row"
            aria-label="Add row"
            className={btn}
          >
            +
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMove(-1);
          }}
          title="Move up"
          aria-label="Move up"
          className={btn}
        >
          ↑
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMove(1);
          }}
          title="Move down"
          aria-label="Move down"
          className={btn}
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate"
          aria-label="Duplicate"
          className={btn}
          disabled={isDragging}
        >
          ⧉
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          title="Delete (⌫)"
          aria-label="Delete block"
          className={`${btn} hover:bg-red-500/70`}
          disabled={isDragging}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── Main visual canvas ─────────────────────────────────────────────────── */

export default function VisualEditorCanvas({
  blocks,
  renderLive,
  emptyHint = "Drag blocks from the palette to build your page",
  selectedId,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  onMove,
  onAddRowToSection,
  onEditText,
}: Props) {
  const { canvasRef, rects } = useElementGeometry();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; field: string } | null>(null);

  const metaById = useMemo(() => {
    const m = new Map<string, PbMeta>();
    for (const meta of collectElementMeta(blocks)) m.set(meta.id, meta);
    return m;
  }, [blocks]);

  const contentKey = useMemo(() => blocks.map((b) => b.id).join(","), [blocks]);

  const selectedRect = selectedId ? rects.get(selectedId) : null;
  const selectedMeta = selectedId ? metaById.get(selectedId) : null;
  const hoverRect = hoverId && hoverId !== selectedId ? rects.get(hoverId) : null;
  const hoverMeta = hoverId ? metaById.get(hoverId) : null;

  /* Apply / clear outline attributes on the live DOM. */
  useEffect(() => {
    const root = canvasRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(`[${PB_EL_ATTR}]`));
    const hoverEl = hoverId ? nodes.find((n) => n.getAttribute(PB_EL_ATTR) === hoverId) : null;
    const selEl = selectedId ? nodes.find((n) => n.getAttribute(PB_EL_ATTR) === selectedId) : null;
    const editEl = editing ? nodes.find((n) => n.getAttribute(PB_EL_ATTR) === editing.id) : null;
    for (const n of nodes) {
      n.removeAttribute("data-pb-hover");
      n.removeAttribute("data-pb-selected");
      n.removeAttribute("data-pb-editing");
    }
    if (hoverEl && !hoverEl.hasAttribute("data-pb-selected")) hoverEl.setAttribute("data-pb-hover", "");
    if (selEl) selEl.setAttribute("data-pb-selected", "");
    if (editEl) editEl.setAttribute("data-pb-editing", "");
  }, [hoverId, selectedId, editing, contentKey, canvasRef]);

  /* Blank the bounding hovered element after a tree re-render. */
  useEffect(() => {
    if (selectedId && !metaById.has(selectedId)) onSelect(null);
    if (hoverId && !metaById.has(hoverId)) setHoverId(null);
  }, [metaById, selectedId, hoverId, onSelect]);

  /* Inline text editing on the selected text node. */
  const startEditing = useCallback(
    (id: string) => {
      const block = findBlock(blocks, id);
      if (!block) return;
      const fields = resolveEditableFields(block.props as Record<string, unknown>);
      if (fields.length === 0) return;
      setEditing({ id, field: fields[0].field });
    },
    [blocks],
  );

  useEffect(() => {
    if (!editing || !onEditText) return;
    const root = canvasRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[${PB_EL_ATTR}="${editing.id}"]`);
    if (!el) return;
    const block = findBlock(blocks, editing.id);
    if (!block) return;
    const value = String((block.props as Record<string, unknown>)[editing.field] ?? "");
    const cleanup = enableInlineTextEdit({
      el,
      field: editing.field,
      value,
      onCommit: (field, next) => {
        const props = {
          ...(block.props as Record<string, unknown>),
          [field]: next,
        };
        setEditing(null);
        onEditText(editing.id, props);
      },
      onCancel: () => setEditing(null),
    });
    return () => cleanup?.();
  }, [editing, blocks, onEditText, canvasRef]);

  /* ── Event delegation (canvas-level, cheap) ───────────────────────── */
  const isUi = (t: EventTarget | null) =>
    t instanceof HTMLElement && t.closest("[data-pb-canvas-ui]") !== null;

  const handleHover = useCallback(
    (e: React.MouseEvent) => {
      if (isUi(e.target)) return;
      const t = e.target as HTMLElement;
      const el = t.closest<HTMLElement>(`[${PB_EL_ATTR}]`);
      const id = el?.getAttribute(PB_EL_ATTR) ?? null;
      if (id === PB_CONTAINER) return;
      setHoverId((prev) => (prev === id ? prev : id));
    },
    [],
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (isUi(e.target)) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>(`[${PB_EL_ATTR}]`);
      if (!el) {
        onSelect(null);
        onSelectColumn(null);
        return;
      }
      const id = el.getAttribute(PB_EL_ATTR)!;
      const kind = el.getAttribute(PB_KIND_ATTR);
      e.preventDefault();
      e.stopPropagation();
      if (id === PB_CONTAINER) {
        onSelect(null);
        return;
      }
      if (kind === "column") {
        onSelectColumn(id);
      } else {
        onSelect(id);
      }
    },
    [onSelect, onSelectColumn],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isUi(e.target)) return;
      if (!onEditText) return;
      const el = (e.target as HTMLElement).closest<HTMLElement>(`[${PB_EL_ATTR}]`);
      if (!el) return;
      const kind = el.getAttribute(PB_KIND_ATTR);
      if (kind !== "block") return;
      const id = el.getAttribute(PB_EL_ATTR)!;
      e.preventDefault();
      e.stopPropagation();
      startEditing(id);
    },
    [onEditText, startEditing],
  );

  const canvasWidth = canvasRef.current?.clientWidth ?? 0;

  const canEditSelected =
    !!onEditText && !!selectedMeta && selectedMeta.kind === "block"
      ? resolveEditableFields(
          (findBlock(blocks, selectedId!)?.props ?? {}) as Record<string, unknown>,
        ).length > 0
      : false;
  const canAddRowSelected = selectedMeta?.kind === "section" && !!onAddRowToSection;

  /* ── Render ──────────────────────────────────────────────────────── */

  if (blocks.length === 0) {
    return (
      <div
        className="flex min-h-[280px] items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-white"
        onClick={() => onSelect(null)}
      >
        <p className="text-sm text-zinc-400">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className="ve-canvas relative"
      onMouseOver={handleHover}
      onMouseLeave={() => setHoverId(null)}
      onClick={handleCanvasClick}
      onDoubleClick={handleDoubleClick}
    >
      <style>{VeCss}</style>

      {/* True front-end render */}
      <div className="ve-live">{renderLive}</div>

      {/* Empty-column hint */}
      {Array.from(rects.entries()).map(([id, rect]) => {
        const meta = metaById.get(id);
        if (!meta || meta.kind !== "column") return null;
        const active = hoverId === id || selectedColumnId === id;
        if (!active || rect.height > 24) return null;
        return (
          <div
            key={`col-${id}`}
            data-pb-canvas-ui
            className="pointer-events-none absolute z-20 flex items-center justify-center rounded border-2 border-dashed border-blue-400 bg-blue-50/60 text-[11px] font-medium text-blue-600"
            style={{ left: rect.left, top: rect.top, width: rect.width, minHeight: 56 }}
          >
            Empty column — drop blocks here
          </div>
        );
      })}

      {/* Droppable anchors for every element */}
      {Array.from(rects.entries()).map(([id, rect]) => {
        if (id === PB_CONTAINER) return null;
        if (id === "__canvas__") return null;
        if (!metaById.has(id)) return null;
        return <Anchor key={id} id={id} rect={rect} />;
      })}

      {/* Hover label */}
      {hoverMeta && hoverRect && hoverId !== selectedId && (
        <div
          data-pb-canvas-ui
          className="pointer-events-none absolute z-20 rounded bg-sky-600 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white shadow"
          style={{
            left: Math.max(0, Math.min(hoverRect.left, canvasWidth - 120)),
            top: Math.max(0, hoverRect.top - 20),
          }}
        >
          {hoverMeta.kind === "block"
            ? blockLabel(hoverMeta.type ?? "", "Block")
            : kindLabel(hoverMeta.kind, hoverMeta.columns !== undefined ? `${hoverMeta.columns} col` : undefined)}
        </div>
      )}

      {/* Selected toolbar */}
      {selectedMeta && selectedRect && !editing && (
        <Toolbar
          id={selectedId!}
          rect={selectedRect}
          meta={selectedMeta}
          canEditText={canEditSelected}
          canAddRow={canAddRowSelected}
          onEdit={() => startEditing(selectedId!)}
          onRemove={() => onRemove(selectedId!)}
          onDuplicate={() => onDuplicate(selectedId!)}
          onMove={(dir) => onMove(selectedId!, dir)}
          onAddRowToSection={() => onAddRowToSection!(selectedId!)}
        />
      )}

      {/* Hint bar */}
      <div
        data-pb-canvas-ui
        className="pointer-events-none absolute bottom-1 left-1/2 z-20 hidden -translate-x-1/2 rounded-full bg-zinc-900/70 px-3 py-1 text-[10px] text-zinc-200 lg:block"
      >
        Click to select · Double-click text to edit · Drag ⠿ to move · ⌫ to delete
      </div>
    </div>
  );
}
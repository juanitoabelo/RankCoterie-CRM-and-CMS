"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block, RowBlock, ColumnData } from "@/lib/page-builder/types";
import { isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import { resolveColumnWidths, canvasColumnSpanClass } from "@/lib/page-builder/spans";
import { validateBlock } from "@/lib/page-builder/validate";

/* ── Sortable Block Wrapper ─────────────────────────────────────────────── */

function SortableBlock({
  block,
  viewport,
  selectedId,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
}: {
  block: Block;
  viewport: "desktop" | "tablet" | "mobile";
  selectedId: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string | null) => void;
  onSelectColumn: (columnId: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const errors = validateBlock(block);
  const isSelected = selectedId === block.id;

  if (isRowBlock(block)) {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div
          className={`group relative rounded-lg border-2 border-dashed p-2 ${
            isSelected
              ? "border-amber-400 bg-amber-50"
              : "border-zinc-200 hover:border-zinc-400"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(block.id);
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span
              {...listeners}
              className="cursor-grab text-xs text-zinc-400 hover:text-zinc-600"
            >
              ⠿
            </span>
            <span className="text-[10px] font-medium uppercase text-zinc-400">
              Row · {block.props.columns.length} col
              {block.props.stackOnMobile ? " · stack" : ""}
            </span>
            <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(block.id);
                }}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-200"
              >
                ⧉
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(block.id);
                }}
                className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-100"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-2">
            {block.props.columns.map((col) => (
              <ColumnCell
                key={col.id}
                column={col}
                rowBlock={block}
                viewport={viewport}
                selectedColumnId={selectedColumnId}
                onSelectColumn={onSelectColumn}
                onSelect={onSelect}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Leaf block preview
  const icon = getBlockIcon(block.type);
  const label = getBlockLabel(block.type);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={`group flex items-center gap-2 rounded-lg border px-3 py-2 ${
          isSelected
            ? "border-amber-400 bg-amber-50"
            : "border-zinc-200 bg-white hover:border-zinc-400"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
      >
        <span
          {...listeners}
          className="cursor-grab text-xs text-zinc-400 hover:text-zinc-600"
        >
          ⠿
        </span>
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-medium text-zinc-700">{label}</span>
        {errors.length > 0 && (
          <span className="ml-auto rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
            {errors.length}
          </span>
        )}
        <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(block.id);
            }}
            className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-200"
          >
            ⧉
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(block.id);
            }}
            className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-100"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Column Cell ────────────────────────────────────────────────────────── */

function ColumnCell({
  column,
  rowBlock,
  viewport,
  selectedColumnId,
  onSelectColumn,
  onSelect,
  onRemove,
  onDuplicate,
}: {
  column: ColumnData;
  rowBlock: RowBlock;
  viewport: "desktop" | "tablet" | "mobile";
  selectedColumnId: string | null;
  onSelectColumn: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const widths = resolveColumnWidths(column, rowBlock.props.stackOnMobile);
  const spanClass = canvasColumnSpanClass(widths, viewport);
  const isSelected = selectedColumnId === column.id;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] rounded border p-2 ${
        isSelected
          ? "border-amber-400 bg-amber-50/50"
          : isOver
            ? "border-blue-400 bg-blue-50/50"
            : "border-zinc-100"
      } ${spanClass}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelectColumn(column.id);
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase text-zinc-300">
          {widths.desktop}/{widths.tablet}/{widths.mobile}
        </span>
      </div>
      <SortableContext
        items={column.blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {column.blocks.map((b) => (
            <SortableBlock
              key={b.id}
              block={b}
              viewport={viewport}
              selectedId={null}
              selectedColumnId={null}
              onSelect={onSelect}
              onSelectColumn={onSelectColumn}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      </SortableContext>
      {column.blocks.length === 0 && (
        <p className="py-2 text-center text-[10px] text-zinc-300">
          Drop blocks here
        </p>
      )}
    </div>
  );
}

/* ── Main Canvas ────────────────────────────────────────────────────────── */

export default function HeaderFooterCanvas({
  blocks,
  viewport,
  selectedId,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
}: {
  blocks: Block[];
  viewport: "desktop" | "tablet" | "mobile";
  selectedId: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string | null) => void;
  onSelectColumn: (columnId: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-root" });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[300px] rounded-xl border-2 border-dashed p-4 ${
        isOver ? "border-amber-400 bg-amber-50/30" : "border-zinc-200 bg-zinc-50"
      }`}
      onClick={() => onSelect(null)}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {blocks.map((b) => (
            <SortableBlock
              key={b.id}
              block={b}
              viewport={viewport}
              selectedId={selectedId}
              selectedColumnId={selectedColumnId}
              onSelect={onSelect}
              onSelectColumn={onSelectColumn}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      </SortableContext>
      {blocks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-zinc-400">
            Drag blocks from the left panel to build your {viewport} layout
          </p>
          <p className="mt-1 text-xs text-zinc-300">
            Start with a Logo and Navigation Menu block
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function getBlockIcon(type: string): string {
  const icons: Record<string, string> = {
    logo: "◎",
    menu: "☰",
    socialIcons: "⏹",
    contactInfo: "📞",
    search: "🔍",
    hero: "⬛",
    text: "📝",
    image: "🖼",
    cta: "🔘",
    features: "📊",
    button: "🔗",
    embed: "</>",
    faq: "❓",
    testimonial: "💬",
    spacer: "↕",
    divider: "—",
    heading: "H",
    list: "≡",
    slider: "◫",
    contentGrid: "▦",
    row: "▦",
    section: "▣",
  };
  return icons[type] ?? "□";
}

function getBlockLabel(type: string): string {
  const labels: Record<string, string> = {
    logo: "Logo",
    menu: "Menu",
    socialIcons: "Social Icons",
    contactInfo: "Contact Info",
    search: "Search",
    hero: "Hero",
    text: "Text",
    image: "Image",
    cta: "CTA",
    features: "Features",
    button: "Button",
    embed: "Embed",
    faq: "FAQ",
    testimonial: "Testimonial",
    spacer: "Spacer",
    divider: "Divider",
    heading: "Heading",
    list: "List",
    slider: "Slider",
    contentGrid: "Content Grid",
    row: "Row",
    section: "Section",
  };
  return labels[type] ?? type;
}

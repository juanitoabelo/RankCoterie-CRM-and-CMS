"use client";

import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  BLOCK_DEFINITIONS,
  isRowBlock,
  type Block,
  type ColumnData,
  type RowBlock,
} from "@/lib/page-builder/types";
import { BlockPreview } from "./BlockPreview";

const SPAN_CLASS: Record<number, string> = {
  3: "md:col-span-3",
  4: "md:col-span-4",
  6: "md:col-span-6",
  8: "md:col-span-8",
  9: "md:col-span-9",
  12: "md:col-span-12",
};

function ColumnCell({
  column,
  spanClass,
  viewport,
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  inlineEditing,
  onUpdateProps,
}: {
  column: ColumnData;
  spanClass: string;
  viewport: "desktop" | "tablet" | "mobile";
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const isActive = selectedColumnId === column.id;

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelectColumn(column.id);
      }}
      role="button"
      aria-label={`Column ${column.span}/12`}
      className={`col-span-12 rounded-md border-2 border-dashed p-2 transition-colors ${spanClass} ${
        isActive
          ? "border-zinc-400 bg-zinc-100/60"
          : isOver
            ? "border-emerald-400 bg-emerald-50"
            : "border-zinc-200 bg-zinc-50/60"
      }`}
      style={{ minWidth: 0 }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          Column · {column.span}/12
          {spanClass === "col-span-12" ? " · full width (stacked)" : ""}
        </span>
      </div>
      <SortableContext
        items={column.blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-[72px] space-y-2">
          {column.blocks.length === 0 ? (
            <p
              className={`flex h-[72px] items-center justify-center rounded border border-dashed p-2 text-center text-[11px] ${
                isOver ? "border-emerald-400 text-emerald-600" : "border-zinc-200 text-zinc-400"
              }`}
            >
              Drop blocks here
            </p>
          ) : (
            column.blocks.map((block) => (
              <SortableBlock
                key={block.id}
                block={block}
                viewport={viewport}
                selected={selected}
                selectedColumnId={selectedColumnId}
                onSelect={onSelect}
                onSelectColumn={onSelectColumn}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
                inlineEditing={inlineEditing}
                onUpdateProps={onUpdateProps}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function RowBody({
  block,
  viewport,
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  inlineEditing,
  onUpdateProps,
}: {
  block: RowBlock;
  viewport: "desktop" | "tablet" | "mobile";
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const stackOnMobile = viewport === "mobile" && block.props.stackOnMobile !== false;
  return (
    <div
      className="mb-2 grid grid-cols-12 px-2"
      style={{ gap: block.props.gap, alignItems: block.props.align }}
    >
      {block.props.columns.map((column) => (
        <ColumnCell
          key={column.id}
          column={column}
          spanClass={
            stackOnMobile ? "col-span-12" : SPAN_CLASS[column.span] ?? "col-span-12"
          }
          viewport={viewport}
          selected={selected}
          selectedColumnId={selectedColumnId}
          onSelect={onSelect}
          onSelectColumn={onSelectColumn}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          inlineEditing={inlineEditing}
          onUpdateProps={onUpdateProps}
        />
      ))}
    </div>
  );
}

function SortableBlock({
  block,
  viewport,
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  inlineEditing,
  onUpdateProps,
}: {
  block: Block;
  viewport: "desktop" | "tablet" | "mobile";
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
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

  const def = BLOCK_DEFINITIONS.find((d) => d.type === block.type);
  const label = def?.label ?? block.type;
  const isSelected = selected === block.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      role="button"
      aria-pressed={isSelected}
      aria-label={label}
      className={`group relative rounded-lg border-2 bg-white transition-all ${
        isSelected ? "border-zinc-900 shadow-md" : "border-zinc-200 hover:border-zinc-400"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Drag ${label} to reorder`}
            className="cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
            title="Drag to reorder"
          >
            ⠿
          </button>
          <span className="text-sm font-medium text-zinc-700">
            {def?.icon} {label}
          </span>
        </div>
        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(block.id);
            }}
            aria-label={`Duplicate ${label}`}
            title="Duplicate"
            className="text-xs text-zinc-400 hover:text-zinc-700"
          >
            ⧉
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(block.id);
            }}
            aria-label={`Delete ${label}`}
            title="Delete"
            className="text-xs text-zinc-400 hover:text-red-500"
          >
            ✕
          </button>
        </div>
      </div>

      {isRowBlock(block) ? (
        <RowBody
          block={block}
          viewport={viewport}
          selected={selected}
          selectedColumnId={selectedColumnId}
          onSelect={onSelect}
          onSelectColumn={onSelectColumn}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          inlineEditing={inlineEditing}
          onUpdateProps={onUpdateProps}
        />
      ) : (
        <BlockPreview
          block={block}
          inlineEditing={inlineEditing && isSelected}
          onUpdateProps={onUpdateProps}
        />
      )}
    </div>
  );
}

export default function BuilderCanvas({
  blocks,
  viewport = "desktop",
  selectedId,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  inlineEditing,
  onUpdateProps,
}: {
  blocks: Block[];
  viewport?: "desktop" | "tablet" | "mobile";
  selectedId: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <SortableContext
      items={blocks.map((b) => b.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
        role="list"
        aria-label="Page canvas"
        className={`space-y-3 rounded-xl p-1 transition-colors ${
          isOver ? "bg-emerald-50/50" : ""
        }`}
      >
        {blocks.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
            <p className="text-sm text-zinc-400">
              No blocks yet. Click a block type on the right to add it, or drag it onto the
              canvas. Add a “Row / Columns” block to design the page layout.
            </p>
          </div>
        )}
        {blocks.map((block) => (
          <SortableBlock
            key={block.id}
            block={block}
            viewport={viewport}
            selected={selectedId}
            selectedColumnId={selectedColumnId}
            onSelect={onSelect}
            onSelectColumn={onSelectColumn}
            onRemove={onRemove}
            onDuplicate={onDuplicate}
            inlineEditing={inlineEditing}
            onUpdateProps={onUpdateProps}
          />
        ))}
      </div>
    </SortableContext>
  );
}
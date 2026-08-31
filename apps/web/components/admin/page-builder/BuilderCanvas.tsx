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

function ColumnCell({
  column,
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
}: {
  column: ColumnData;
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
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
      className={`rounded-md border-2 border-dashed p-2 transition-colors ${
        isActive
          ? "border-zinc-400 bg-zinc-100/60"
          : isOver
            ? "border-emerald-400 bg-emerald-50"
            : "border-zinc-200 bg-zinc-50/60"
      }`}
      style={{ width: `${(column.span / 12) * 100}%`, minWidth: 80 }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          Column · {column.span}/12
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
                selected={selected}
                selectedColumnId={selectedColumnId}
                onSelect={onSelect}
                onSelectColumn={onSelectColumn}
                onRemove={onRemove}
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
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
}: {
  block: RowBlock;
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      className="mb-2 flex px-2"
      style={{ gap: block.props.gap, alignItems: block.props.align }}
    >
      {block.props.columns.map((column) => (
        <ColumnCell
          key={column.id}
          column={column}
          selected={selected}
          selectedColumnId={selectedColumnId}
          onSelect={onSelect}
          onSelectColumn={onSelectColumn}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

function SortableBlock({
  block,
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
}: {
  block: Block;
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
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
            className="cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
            title="Drag to reorder"
          >
            ⠿
          </button>
          <span className="text-sm font-medium text-zinc-700">
            {def?.icon} {label}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(block.id);
          }}
          className="text-xs text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-500"
        >
          ✕
        </button>
      </div>

      {isRowBlock(block) ? (
        <RowBody
          block={block}
          selected={selected}
          selectedColumnId={selectedColumnId}
          onSelect={onSelect}
          onSelectColumn={onSelectColumn}
          onRemove={onRemove}
        />
      ) : (
        <BlockPreview block={block} />
      )}
    </div>
  );
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return (
        <div
          className="mx-2 mb-2 rounded-md px-4 py-6 text-center text-xs"
          style={{ backgroundColor: block.props.bgColor, color: block.props.textColor }}
        >
          <div className="font-semibold">{block.props.heading || "Hero heading"}</div>
          <div className="mt-1 opacity-70">{block.props.subheading || "Subheading"}</div>
        </div>
      );
    case "text":
      return (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <div
            className={`line-clamp-3 ${block.props.align === "center" ? "text-center" : block.props.align === "right" ? "text-right" : "text-left"}`}
            dangerouslySetInnerHTML={{ __html: block.props.content }}
          />
        </div>
      );
    case "image":
      return (
        <div className="mx-2 mb-2 rounded-md bg-zinc-100 px-3 py-4 text-center text-xs text-zinc-400">
          {block.props.src ? (
            <img
              src={block.props.src}
              alt={block.props.alt}
              className="mx-auto max-h-24 rounded object-cover"
            />
          ) : (
            "🖼 Image placeholder"
          )}
        </div>
      );
    case "cta":
      return (
        <div
          className="mx-2 mb-2 rounded-md px-4 py-4 text-center text-xs"
          style={{ backgroundColor: block.props.bgColor }}
        >
          <div className="font-medium text-zinc-900">{block.props.heading || "CTA heading"}</div>
          <div className="mt-1 text-zinc-600">{block.props.body || "CTA body"}</div>
          <div className="mt-2 inline-block rounded bg-zinc-900 px-3 py-1 text-xs text-white">
            {block.props.buttonText || "Button"}
          </div>
        </div>
      );
    case "features":
      return (
        <div className="mx-2 mb-2 rounded-md bg-zinc-50 px-3 py-2 text-xs">
          <div className="font-medium text-zinc-700">{block.props.heading || "Features"}</div>
          <div className="mt-1 text-zinc-500">
            {block.props.items.length} items · {block.props.columns} columns
          </div>
        </div>
      );
    case "spacer":
      return (
        <div className="mx-2 mb-2 flex items-center justify-center text-xs text-zinc-300">
          ↕ {block.props.height}px
        </div>
      );
    case "divider":
      return (
        <div className="mx-2 mb-2">
          <hr className="border-zinc-200" />
        </div>
      );
    default:
      return null;
  }
}

export default function BuilderCanvas({
  blocks,
  selectedId,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
}: {
  blocks: Block[];
  selectedId: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <SortableContext
      items={blocks.map((b) => b.id)}
      strategy={verticalListSortingStrategy}
    >
      <div
        ref={setNodeRef}
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
            selected={selectedId}
            selectedColumnId={selectedColumnId}
            onSelect={onSelect}
            onSelectColumn={onSelectColumn}
            onRemove={onRemove}
          />
        ))}
      </div>
    </SortableContext>
  );
}
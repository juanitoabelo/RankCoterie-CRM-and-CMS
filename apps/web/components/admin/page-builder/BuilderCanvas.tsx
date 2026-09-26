"use client";

import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  BLOCK_DEFINITIONS,
  CANVAS_ROOT_ID,
  isRowBlock,
  isSectionBlock,
  type Block,
  type ColumnData,
  type RowBlock,
  type SectionBlock,
} from "@/lib/page-builder/types";
import {
  canvasColumnSpanClass,
  resolveColumnWidths,
  type ColumnWidths,
} from "@/lib/page-builder/spans";
import { BlockPreview } from "./BlockPreview";
import { renderOverlay } from "./renderHelpers";

function ColumnCell({
  column,
  widths,
  viewport,
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  onAddRowToSection,
  inlineEditing,
  onUpdateProps,
}: {
  column: ColumnData;
  widths: ColumnWidths;
  viewport: "desktop" | "tablet" | "mobile";
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddRowToSection: (sectionId: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const isActive = selectedColumnId === column.id;
  const spanClass = canvasColumnSpanClass(widths, viewport);
  const isResponsive =
    widths.desktop !== widths.tablet || widths.desktop !== widths.mobile;

  const colStyle = column.bgImage
    ? {
        backgroundColor: column.bgColor,
        backgroundImage: `url(${column.bgImage})`,
        backgroundSize: (column.bgSize || "cover") as "cover" | "contain" | "auto",
        backgroundPosition: (column.bgPosition || "center center") as React.CSSProperties["backgroundPosition"],
        backgroundRepeat: (column.bgRepeat || "no-repeat") as React.CSSProperties["backgroundRepeat"],
      }
    : { backgroundColor: column.bgColor };

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelectColumn(column.id);
      }}
      role="button"
      aria-label={`Column ${widths.desktop}/12 (${widths.tablet}/12 tablet, ${widths.mobile}/12 mobile)`}
      className={`rounded-md border-2 p-2 transition-colors ${spanClass} ${
        isActive
          ? "border-zinc-400 bg-zinc-100/60"
          : isOver
            ? "border-emerald-400 bg-emerald-50"
            : "border-dashed border-zinc-200 bg-zinc-50/60"
      }`}
      style={{ minWidth: 0, ...colStyle }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="rounded bg-white/90 px-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          Column · {widths[viewport]}/12
          {spanClass === "col-span-12" && viewport !== "desktop" ? " · full width" : ""}
        </span>
        {isResponsive && (
          <span
            title="Responsive widths — Desktop / Tablet / Mobile"
            className="rounded bg-emerald-600/10 px-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700"
          >
            D{widths.desktop}/T{widths.tablet}/M{widths.mobile}
          </span>
        )}
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
                onAddRowToSection={onAddRowToSection}
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
  onAddRowToSection,
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
  onAddRowToSection: (sectionId: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const stackDefault = block.props.stackOnMobile !== false;
  const rowStyle = block.props.bgImage
    ? {
        backgroundColor: block.props.bgColor,
        backgroundImage: `url(${block.props.bgImage})`,
        backgroundSize: (block.props.bgSize || "cover") as "cover" | "contain" | "auto",
        backgroundPosition: (block.props.bgPosition || "center center") as React.CSSProperties["backgroundPosition"],
        backgroundRepeat: (block.props.bgRepeat || "no-repeat") as React.CSSProperties["backgroundRepeat"],
        color: block.props.textColor,
      }
    : { backgroundColor: block.props.bgColor, color: block.props.textColor };
  return (
    <div className="relative mb-2 overflow-hidden rounded-md px-2" style={rowStyle}>
      {renderOverlay({
        overlayBgType: block.props.overlayBgType,
        overlayColor: block.props.overlayColor,
        overlayColor2: block.props.overlayColor2,
        overlayGradientStart: block.props.overlayGradientStart,
        overlayGradientEnd: block.props.overlayGradientEnd,
        overlayGradientAngle: block.props.overlayGradientAngle,
        overlayOpacity: block.props.overlayOpacity,
      })}
      <div
        className="relative grid grid-cols-12"
        style={{ gap: block.props.gap, alignItems: block.props.align, zIndex: 1 }}
      >
        {block.props.columns.map((column) => (
        <ColumnCell
          key={column.id}
          column={column}
          widths={resolveColumnWidths(column, stackDefault)}
          viewport={viewport}
          selected={selected}
          selectedColumnId={selectedColumnId}
          onSelect={onSelect}
          onSelectColumn={onSelectColumn}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onAddRowToSection={onAddRowToSection}
          inlineEditing={inlineEditing}
          onUpdateProps={onUpdateProps}
        />
      ))}
      </div>
    </div>
  );
}

function SectionBody({
  block,
  viewport,
  selected,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  onAddRowToSection,
  inlineEditing,
  onUpdateProps,
}: {
  block: SectionBlock;
  viewport: "desktop" | "tablet" | "mobile";
  selected: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string) => void;
  onSelectColumn: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddRowToSection: (sectionId: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const sectionStyle = block.props.bgImage
    ? {
        backgroundColor: block.props.bgColor,
        backgroundImage: `url(${block.props.bgImage})`,
        backgroundSize: (block.props.bgSize || "cover") as "cover" | "contain" | "auto",
        backgroundPosition: (block.props.bgPosition || "center center") as React.CSSProperties["backgroundPosition"],
        backgroundRepeat: (block.props.bgRepeat || "no-repeat") as React.CSSProperties["backgroundRepeat"],
        color: block.props.textColor,
        paddingTop: block.props.paddingTop ?? 48,
        paddingBottom: block.props.paddingBottom ?? 48,
      }
    : {
        backgroundColor: block.props.bgColor,
        color: block.props.textColor,
        paddingTop: block.props.paddingTop ?? 48,
        paddingBottom: block.props.paddingBottom ?? 48,
      };

  return (
    <div className="relative mb-2 overflow-hidden rounded-md border border-zinc-200/60" style={sectionStyle}>
      {renderOverlay({
        overlayBgType: block.props.overlayBgType,
        overlayColor: block.props.overlayColor,
        overlayColor2: block.props.overlayColor2,
        overlayGradientStart: block.props.overlayGradientStart,
        overlayGradientEnd: block.props.overlayGradientEnd,
        overlayGradientAngle: block.props.overlayGradientAngle,
        overlayOpacity: block.props.overlayOpacity,
      })}
      <div className="relative" style={{ zIndex: 1 }}>
      <div className="flex items-center gap-2 px-2 pt-1">
        <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          ▣ Section · {block.props.rows.length} row{block.props.rows.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={() => onAddRowToSection(block.id)}
          className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 hover:bg-blue-50"
        >
          + Row
        </button>
      </div>
      <div className="space-y-2 px-2 pb-2">
        {block.props.rows.length === 0 ? (
          <button
            onClick={() => onAddRowToSection(block.id)}
            className="flex min-h-[64px] w-full items-center justify-center rounded border border-dashed border-zinc-300 text-[11px] text-zinc-400 hover:border-blue-400 hover:text-blue-500"
          >
            Empty section — click to add a row
          </button>
        ) : (
          block.props.rows.map((row) => (
            <div
              key={row.id}
              className={`group/row relative rounded border border-dashed p-2 ${
                selected === row.id
                  ? "border-amber-400 bg-amber-50"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(row.id);
              }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase text-zinc-400">
                  Row · {row.props.columns.length} col
                </span>
                <div className="ml-auto flex gap-1 opacity-0 group-hover/row:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(row.id);
                    }}
                    className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-200"
                  >
                    ⧉
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(row.id);
                    }}
                    className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <RowBody
                block={row}
                viewport={viewport}
                selected={selected}
                selectedColumnId={selectedColumnId}
                onSelect={onSelect}
                onSelectColumn={onSelectColumn}
                onRemove={onRemove}
                onDuplicate={onDuplicate}
                onAddRowToSection={onAddRowToSection}
                inlineEditing={inlineEditing}
                onUpdateProps={onUpdateProps}
              />
            </div>
          ))
        )}
      </div>
      </div>
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
  onAddRowToSection,
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
  onAddRowToSection: (sectionId: string) => void;
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

      {isSectionBlock(block) ? (
        <SectionBody
          block={block}
          viewport={viewport}
          selected={selected}
          selectedColumnId={selectedColumnId}
          onSelect={onSelect}
          onSelectColumn={onSelectColumn}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onAddRowToSection={onAddRowToSection}
          inlineEditing={inlineEditing}
          onUpdateProps={onUpdateProps}
        />
      ) : isRowBlock(block) ? (
        <RowBody
          block={block}
          viewport={viewport}
          selected={selected}
          selectedColumnId={selectedColumnId}
          onSelect={onSelect}
          onSelectColumn={onSelectColumn}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onAddRowToSection={onAddRowToSection}
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
  onAddRowToSection,
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
  onAddRowToSection: (sectionId: string) => void;
  inlineEditing?: boolean;
  onUpdateProps?: (id: string, props: Block["props"]) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_ROOT_ID });

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
              canvas. Add a "Row / Columns" block to design the page layout, or a
              "Section (Full Width)" to create a full-width area with background.
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
            onAddRowToSection={onAddRowToSection}
            inlineEditing={inlineEditing}
            onUpdateProps={onUpdateProps}
          />
        ))}
      </div>
    </SortableContext>
  );
}

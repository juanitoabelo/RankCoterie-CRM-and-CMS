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
import type { ContainerSettings } from "@/lib/header-footer/types";
import { HeaderFooterBlockRenderer } from "./HeaderFooterRenderer";

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
  onAddRowToSection,
}: {
  block: Block;
  viewport: "desktop" | "tablet" | "mobile";
  selectedId: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string | null) => void;
  onSelectColumn: (columnId: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddRowToSection: (sectionId: string) => void;
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

  if (isSectionBlock(block)) {
    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div
          className={`group relative rounded-lg border-2 border-dashed p-3 ${
            isSelected
              ? "border-amber-400 bg-amber-50"
              : "border-zinc-300 hover:border-zinc-400"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(block.id);
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <span
              {...listeners}
              className="cursor-grab text-xs text-zinc-400 hover:text-zinc-600"
            >
              ⠿
            </span>
            <span className="text-[10px] font-medium uppercase text-zinc-500">
              Container · {block.props.rows.length} row{block.props.rows.length !== 1 ? "s" : ""}
            </span>
            <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRowToSection(block.id);
                }}
                className="rounded px-1.5 py-0.5 text-[10px] text-blue-500 hover:bg-blue-100"
              >
                + Row
              </button>
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
          <div className="space-y-2">
            {block.props.rows.map((row) => (
              <div
                key={row.id}
                className={`group/row relative rounded border border-dashed p-2 ${
                  selectedId === row.id
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
                <div className="grid grid-cols-12 gap-2">
                  {row.props.columns.map((col) => (
                    <ColumnCell
                      key={col.id}
                      column={col}
                      rowBlock={row}
                      viewport={viewport}
                      selectedColumnId={selectedColumnId}
                      onSelectColumn={onSelectColumn}
                      onSelect={onSelect}
                      onRemove={onRemove}
                      onDuplicate={onDuplicate}
                      onAddRowToSection={onAddRowToSection}
                    />
                  ))}
                </div>
              </div>
            ))}
            {block.props.rows.length === 0 && (
              <div
                className="cursor-pointer rounded border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-400 hover:border-blue-400 hover:text-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddRowToSection(block.id);
                }}
              >
                Empty container — click to add a row
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
                onAddRowToSection={onAddRowToSection}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Leaf block preview — render actual block visually
  const icon = getBlockIcon(block.type);
  const label = getBlockLabel(block.type);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        className={`group relative rounded-lg border ${
          isSelected
            ? "border-amber-400 ring-1 ring-amber-200"
            : "border-zinc-200 hover:border-zinc-400"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
      >
        {/* Controls bar */}
        <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5">
          <span
            {...listeners}
            className="cursor-grab text-xs text-zinc-400 hover:text-zinc-600"
          >
            ⠿
          </span>
          <span className="text-xs">{icon}</span>
          <span className="text-[11px] font-medium text-zinc-600">{label}</span>
          {errors.length > 0 && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
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
        {/* Live preview */}
        <div className="pointer-events-none overflow-hidden bg-white">
          <HeaderFooterBlockRenderer block={block} />
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
  onAddRowToSection,
}: {
  column: ColumnData;
  rowBlock: RowBlock;
  viewport: "desktop" | "tablet" | "mobile";
  selectedColumnId: string | null;
  onSelectColumn: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddRowToSection: (sectionId: string) => void;
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
              onAddRowToSection={onAddRowToSection}
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
  containerSettings,
  selectedId,
  selectedColumnId,
  onSelect,
  onSelectColumn,
  onRemove,
  onDuplicate,
  onAddRowToSection,
}: {
  blocks: Block[];
  viewport: "desktop" | "tablet" | "mobile";
  containerSettings: ContainerSettings;
  selectedId: string | null;
  selectedColumnId: string | null;
  onSelect: (id: string | null) => void;
  onSelectColumn: (columnId: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddRowToSection: (sectionId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-root" });

  const outerStyle: React.CSSProperties = {
    backgroundColor: containerSettings.bgColor,
    backgroundImage: containerSettings.bgImage ? `url(${containerSettings.bgImage})` : undefined,
    backgroundPosition: containerSettings.bgPosition,
    backgroundSize: containerSettings.bgSize,
    backgroundRepeat: containerSettings.bgRepeat,
    borderStyle: containerSettings.borderStyle,
    borderWidth: containerSettings.borderWidth,
    borderColor: containerSettings.borderColor,
    borderRadius: containerSettings.borderRadius,
    marginTop: containerSettings.margin.top,
    marginRight: containerSettings.margin.right,
    marginBottom: containerSettings.margin.bottom,
    marginLeft: containerSettings.margin.left,
    paddingTop: containerSettings.padding.top,
    paddingRight: containerSettings.padding.right,
    paddingBottom: containerSettings.padding.bottom,
    paddingLeft: containerSettings.padding.left,
    position: "relative" as const,
    overflow: "hidden",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: containerSettings.width === "boxed" ? containerSettings.maxWidth : "100%",
    margin: containerSettings.width === "boxed" ? "0 auto" : undefined,
    minHeight: containerSettings.minHeight || undefined,
    display: "flex",
    flexDirection: containerSettings.direction === "column" ? "column" : "row",
    justifyContent: containerSettings.justifyContent,
    alignItems: containerSettings.alignItems,
    columnGap: containerSettings.gapCol,
    rowGap: containerSettings.gapRow,
    flexWrap: containerSettings.wrap,
    zIndex: containerSettings.zindex || undefined,
  };

  const overlayStyle: React.CSSProperties | undefined = containerSettings.bgImage && containerSettings.overlayOpacity
    ? {
        position: "absolute",
        inset: 0,
        backgroundColor: containerSettings.overlayColor || "#000000",
        opacity: containerSettings.overlayOpacity / 100,
        pointerEvents: "none",
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[300px] rounded-xl border-2 border-dashed p-4 ${
        isOver ? "border-amber-400 bg-amber-50/30" : "border-zinc-200 bg-zinc-50"
      }`}
      onClick={() => onSelect(null)}
      style={outerStyle}
    >
      {/* Container overlay */}
      {overlayStyle && <div style={overlayStyle} />}

      {/* Container width indicator */}
      {containerSettings.width === "boxed" && (
        <div
          className="mb-2 border border-dashed border-zinc-300 bg-white/50 p-1"
          style={{ maxWidth: containerSettings.maxWidth, margin: "0 auto", position: "relative", zIndex: 1 }}
        >
          <span className="text-[9px] text-zinc-400">
            Container: {containerSettings.maxWidth}px
          </span>
        </div>
      )}

      <div style={{ ...innerStyle, position: "relative", zIndex: 1 }}>
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3" style={{ flex: 1 }}>
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
                onAddRowToSection={onAddRowToSection}
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

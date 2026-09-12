"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  HEADER_FOOTER_SPECIALIZED_DEFINITIONS,
  HEADER_FOOTER_ROW_LAYOUTS,
} from "@/lib/header-footer/types";
import {
  BLOCK_DEFINITIONS,
  ROW_LAYOUTS,
} from "@/lib/page-builder/types";

const PALETTE_PREFIX = "palette:";
const LAYOUT_PREFIX = "layout:";

function DraggableItem({
  id,
  icon,
  label,
  onClick,
}: {
  id: string;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-lg border border-zinc-200 bg-white p-2 text-center hover:border-zinc-400 hover:bg-zinc-50 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-medium text-zinc-600">{label}</span>
    </button>
  );
}

export default function HeaderFooterPalette({
  onAdd,
  onAddLayout,
}: {
  onAdd: (type: string) => void;
  onAddLayout: (layoutId: string) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
      {/* ── HEADER / FOOTER BLOCKS ──────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Header / Footer
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {HEADER_FOOTER_SPECIALIZED_DEFINITIONS.map((def) => (
            <DraggableItem
              key={def.type}
              id={`${PALETTE_PREFIX}${def.type}`}
              icon={def.icon}
              label={def.label}
              onClick={() => onAdd(def.type)}
            />
          ))}
        </div>
      </div>

      {/* ── LAYOUT ──────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Layout
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <DraggableItem
            id={`${LAYOUT_PREFIX}container`}
            icon="▣"
            label="Container"
            onClick={() => onAddLayout("container")}
          />
          <DraggableItem
            id={`${LAYOUT_PREFIX}row`}
            icon="▦"
            label="Row"
            onClick={() => onAddLayout("row")}
          />
          {HEADER_FOOTER_ROW_LAYOUTS.map((layout) => (
            <DraggableItem
              key={layout.id}
              id={`${LAYOUT_PREFIX}${layout.id}`}
              icon={layout.icon}
              label={layout.label}
              onClick={() => onAddLayout(layout.id)}
            />
          ))}
        </div>
      </div>

      {/* ── BASIC BLOCKS ────────────────────────────────────────── */}
      <div>
        <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Basic
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {BLOCK_DEFINITIONS.filter(
            (d) =>
              !HEADER_FOOTER_SPECIALIZED_DEFINITIONS.some((s) => s.type === d.type) &&
              d.type !== "row" &&
              d.type !== "section",
          ).map((def) => (
            <DraggableItem
              key={def.type}
              id={`${PALETTE_PREFIX}${def.type}`}
              icon={def.icon}
              label={def.label}
              onClick={() => onAdd(def.type)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

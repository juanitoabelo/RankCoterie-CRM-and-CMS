"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  BLOCK_DEFINITIONS,
  PALETTE_PREFIX,
  type BlockType,
} from "@/lib/page-builder/types";

function PaletteItem({
  type,
  label,
  icon,
  onAdd,
}: {
  type: BlockType;
  label: string;
  icon: string;
  onAdd: (type: BlockType) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${PALETTE_PREFIX}${type}`,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(type)}
      className={`flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-left text-sm text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span className="text-base">{icon}</span>
      {label}
    </button>
  );
}

export default function BlockPalette({
  onAdd,
}: {
  onAdd: (type: BlockType) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Add block
      </h3>
      <p className="mt-1 text-[11px] leading-snug text-zinc-400">
        Click to add, or drag onto the canvas or into a column.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {BLOCK_DEFINITIONS.map((def) => (
          <PaletteItem
            key={def.type}
            type={def.type}
            label={def.label}
            icon={def.icon}
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}
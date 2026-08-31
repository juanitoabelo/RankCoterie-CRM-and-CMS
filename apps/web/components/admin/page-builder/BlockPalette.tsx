"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  BLOCK_DEFINITIONS,
  LAYOUT_PREFIX,
  PALETTE_PREFIX,
  ROW_LAYOUTS,
  SNIPPET_PREFIX,
  type BlockType,
} from "@/lib/page-builder/types";

export interface PaletteSnippet {
  id: string;
  name: string;
}

function DraggableItem({
  dragId,
  onClick,
  children,
  ariaLabel,
}: {
  dragId: string;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={ariaLabel}
      onClick={onClick}
      onDragStart={(e) => e.stopPropagation()}
      className={`flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-left text-sm text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {children}
    </button>
  );
}

export default function BlockPalette({
  onAdd,
  onAddLayout,
  snippets,
  onAddSnippet,
  onDeleteSnippet,
}: {
  onAdd: (type: BlockType) => void;
  onAddLayout: (layoutId: string) => void;
  snippets: PaletteSnippet[];
  onAddSnippet: (snippetId: string) => void;
  onDeleteSnippet: (id: string) => void;
}) {
  const definitionTypes = BLOCK_DEFINITIONS.filter((d) => d.type !== "row");

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Add block
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Click to add, or drag onto the canvas or into a column.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {definitionTypes.map((def) => (
            <DraggableItem
              key={def.type}
              dragId={`${PALETTE_PREFIX}${def.type}`}
              onClick={() => onAdd(def.type)}
              ariaLabel={`Add ${def.label}`}
            >
              <span className="text-base">{def.icon}</span>
              {def.label}
            </DraggableItem>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Row layouts
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Insert a fully formed row with columns already set up.
        </p>
        <div className="mt-3 space-y-2">
          {ROW_LAYOUTS.map((layout) => (
            <DraggableItem
              key={layout.id}
              dragId={`${LAYOUT_PREFIX}${layout.id}`}
              onClick={() => onAddLayout(layout.id)}
              ariaLabel={layout.label}
            >
              <span className="text-base text-zinc-400">{layout.icon}</span>
              {layout.label}
            </DraggableItem>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Snippets
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-zinc-400">
          Reusable blocks saved from a page. Click to add, drag to place.
        </p>
        {snippets.length === 0 ? (
          <p className="mt-3 text-[11px] text-zinc-300">
            No snippets yet. Select a block and use “Save as snippet”.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {snippets.map((snippet) => (
              <div key={snippet.id} className="flex items-stretch gap-1">
                <DraggableItem
                  dragId={`${SNIPPET_PREFIX}${snippet.id}`}
                  onClick={() => onAddSnippet(snippet.id)}
                  ariaLabel={`Add snippet ${snippet.name}`}
                >
                  <span className="text-base text-zinc-400">▦</span>
                  <span className="truncate">{snippet.name}</span>
                </DraggableItem>
                <button
                  type="button"
                  onClick={() => onDeleteSnippet(snippet.id)}
                  aria-label={`Delete snippet ${snippet.name}`}
                  title="Delete snippet"
                  className="shrink-0 rounded-lg px-2 text-sm text-zinc-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
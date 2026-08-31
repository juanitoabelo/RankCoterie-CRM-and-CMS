"use client";

import { BLOCK_DEFINITIONS, type BlockType } from "@/lib/page-builder/types";

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
      <div className="mt-3 grid grid-cols-2 gap-2">
        {BLOCK_DEFINITIONS.map((def) => (
          <button
            key={def.type}
            onClick={() => onAdd(def.type)}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-left text-sm text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
          >
            <span className="text-base">{def.icon}</span>
            {def.label}
          </button>
        ))}
      </div>
    </div>
  );
}

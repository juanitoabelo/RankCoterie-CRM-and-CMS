"use client";

import { useState } from "react";
import { createBlock, type BlockType } from "@/lib/page-builder/types";
import type { Block } from "@/lib/page-builder/types";
import ProductTemplatePalette from "./ProductTemplatePalette";
import ProductTemplateCanvas from "./ProductTemplateCanvas";

interface Props {
  initialBlocks: Block[];
  onSave: (data: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ ok: boolean }>;
}

export default function ProductTemplateEditor({ initialBlocks, onSave, onDelete }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSave = async () => {
    const result = await onSave(JSON.stringify({ blocks }));
    if (!result.ok) {
      // Show error
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <ProductTemplatePalette onAdd={(type) => {
        try {
          const newBlock = createBlock(type as BlockType);
          setBlocks((prev) => [...prev, newBlock]);
        } catch {
          // Unknown block type from palette — ignore.
        }
      }} />
      
      <ProductTemplateCanvas
        blocks={blocks}
        onSelect={(id) => setSelectedId(id)}
        onRemove={(id) => {
          // Handle removal
        }}
      />
      
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Save Template
        </button>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
"use client";

import type { Block } from "@/lib/page-builder/types";

interface Props {
  blocks: Block[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  renderLive?: boolean;
  viewport?: "desktop" | "tablet" | "mobile";
}

function blockHeading(block: Block): string | null {
  const props = block.props as { heading?: unknown } | undefined;
  return typeof props?.heading === "string" ? props.heading : null;
}

export default function ProductTemplateCanvas({
  blocks,
  onSelect,
}: Props) {
  return (
    <div className="p-4 border rounded-lg border-zinc-200 bg-white min-h-[400px]">
      {blocks.map((block) => {
        const heading = blockHeading(block);
        return (
          <div
            key={block.id}
            className="p-3 rounded-md border border-zinc-200 bg-zinc-50 mb-3 cursor-pointer hover:bg-zinc-100 transition-colors"
            onClick={() => onSelect(block.id)}
          >
            <span className="font-medium text-zinc-800">{block.type}</span>
            {heading && <p className="text-xs text-zinc-500 mt-1">{heading}</p>}
          </div>
        );
      })}
      {blocks.length === 0 && (
        <p className="text-sm text-zinc-500">Drag blocks from the palette to build your product page</p>
      )}
    </div>
  );
}

"use client";

import { useState, useCallback, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  BLOCK_DEFINITIONS,
  createBlock,
  isRowBlock,
  PALETTE_PREFIX,
  type Block,
  type BlockType,
} from "@/lib/page-builder/types";
import {
  addBlockFromPalette,
  findColumnForBlock,
  moveBlock,
  removeBlock as removeBlockFromTree,
  updateBlockProps as updatePropsInTree,
} from "@/lib/page-builder/tree";
import BlockPalette from "./BlockPalette";
import BuilderCanvas from "./BuilderCanvas";
import BlockEditor from "./BlockEditor";

export default function PageBuilder({
  pageId,
  initialBlocks,
  onSave,
}: {
  pageId: string;
  initialBlocks: Block[];
  onSave: (pageId: string, blocksJson: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const addBlock = useCallback(
    (type: BlockType) => {
      const newBlock = createBlock(type);
      if (isRowBlock(newBlock) || !selectedColumnId) {
        setBlocks((prev) => [...prev, newBlock]);
      } else {
        setBlocks((prev) => addBlockFromPalette(prev, newBlock, selectedColumnId));
      }
      setSelectedId(newBlock.id);
    },
    [selectedColumnId],
  );

  const onSelectBlock = useCallback(
    (id: string) => {
      const col = findColumnForBlock(blocks, id);
      setSelectedColumnId(col?.column.id ?? null);
      setSelectedId(id);
    },
    [blocks],
  );

  const onSelectColumn = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setSelectedId(null);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => removeBlockFromTree(prev, id));
    setSelectedId((prev) => (prev === id ? null : prev));
    setSelectedColumnId(null);
  }, []);

  const updateBlockProps = useCallback((id: string, props: Block["props"]) => {
    setBlocks((prev) => updatePropsInTree(prev, id, props));
  }, []);

  const addToColumn = useCallback((columnId: string, type: BlockType) => {
    const newBlock = createBlock(type);
    setBlocks((prev) => addBlockFromPalette(prev, newBlock, columnId));
    setSelectedId(newBlock.id);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith(PALETTE_PREFIX)) return;
    setSelectedId(id);
    const col = findColumnForBlock(blocks, id);
    setSelectedColumnId(col?.column.id ?? null);
  }, [blocks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith(PALETTE_PREFIX)) {
      const type = activeId.slice(PALETTE_PREFIX.length) as BlockType;
      const newBlock = createBlock(type);
      setBlocks((prev) => addBlockFromPalette(prev, newBlock, overId));
      setSelectedId(newBlock.id);
      return;
    }

    setBlocks((prev) => moveBlock(prev, activeId, overId));
  }, []);

  const handleSave = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await onSave(pageId, JSON.stringify(blocks));
      setMessage({ ok: res.ok, text: res.ok ? "Page saved." : (res.error ?? "Save failed.") });
    });
  };

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <BuilderCanvas
            blocks={blocks}
            selectedId={selectedId}
            selectedColumnId={selectedColumnId}
            onSelect={onSelectBlock}
            onSelectColumn={onSelectColumn}
            onRemove={removeBlock}
          />
        </DndContext>
      </div>

      <div className="w-80 shrink-0 space-y-4">
        <BlockPalette onAdd={addBlock} />

        {selectedColumnId && !selectedBlock && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
            Adding blocks will drop them into the selected column. Drag a block type over a
            column to place it exactly.
          </div>
        )}

        {selectedBlock && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Edit {BLOCK_DEFINITIONS.find((d) => d.type === selectedBlock.type)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <BlockEditor
                block={selectedBlock}
                onChange={(props) => updateBlockProps(selectedBlock.id, props)}
                onAddToColumn={addToColumn}
              />
            </div>
          </div>
        )}

        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.text}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save page"}
        </button>
      </div>
    </div>
  );
}
"use client";

import { useState, useCallback, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { BLOCK_DEFINITIONS, createBlock, type Block, type BlockType } from "@/lib/page-builder/types";
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
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  const addBlock = useCallback((type: BlockType) => {
    const newBlock = createBlock(type);
    setBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  const updateBlockProps = useCallback((id: string, props: Block["props"]) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, props } as Block : b)),
    );
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
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
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <BuilderCanvas
              blocks={blocks}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onRemove={removeBlock}
            />
          </SortableContext>
        </DndContext>
      </div>

      <div className="w-80 shrink-0 space-y-4">
        <BlockPalette onAdd={addBlock} />

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

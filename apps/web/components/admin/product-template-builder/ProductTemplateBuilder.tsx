"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Block } from "@/lib/page-builder/types";
import { createBlock } from "@/lib/page-builder/types";
import { innermostPointerWithin } from "@/lib/page-builder/collision";
import { DEFAULT_CONTAINER_SETTINGS } from "@/lib/product-template/types";
import { parseProductTemplateData, serializeProductTemplateData } from "@/modules/product-template/queries";
import ProductTemplatePalette from "./ProductTemplatePalette";
import ProductTemplateCanvas from "./ProductTemplateCanvas";

type SaveResult = { ok: true } | { ok: false; error: string };

interface Props {
  templateId: string;
  templateName: string;
  initialBlocks: Block[];
  initialContainerSettings?: any;
  isDefault: boolean;
  initialAssignments: Array<{
    id: string;
    pageId: string | null;
    pageType: string | null;
    priority: number;
  }>;
  themeColors?: Array<{ key: string; label: string; color: string }>;
  onSave: (
    id: string,
    data: string,
    opts?: { createRevision?: boolean },
  ) => Promise<SaveResult>;
  onListRevisions: (id: string) => Promise<any[]>;
  onRestoreRevision: (
    id: string,
    revisionId: string,
  ) => Promise<SaveResult & { data?: string }>;
}

export default function ProductTemplateBuilder({
  templateId,
  templateName,
  initialBlocks,
  initialContainerSettings,
  isDefault,
  initialAssignments,
  themeColors,
  onSave,
  onListRevisions,
  onRestoreRevision,
}: Props) {
  /* ── State ──────────────────────────────────────────────────────── */
  const [history, setHistory] = useState<{
    past: Block[][];
    present: Block[];
    future: Block[][];
  }>({ past: [], present: initialBlocks, future: [] });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [viewMode, setViewMode] = useState<"visual" | "structure">("visual");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showAssignments, setShowAssignments] = useState(false);
  const [containerSettings, setContainerSettings] = useState< any>(
    initialContainerSettings ?? DEFAULT_CONTAINER_SETTINGS,
  );
  const savedRef = useRef(JSON.stringify(initialBlocks));
  const blocksRef = useRef(initialBlocks);

  const blocks = history.present;

  /* ── Commit (core mutation pattern) ─────────────────────────────── */
  const commit = useCallback(
    (mutator: (present: Block[]) => Block[]) => {
      setHistory((h) => {
        const next = mutator(h.present);
        if (next === h.present) return h;
        return {
          past: [...h.past.slice(-49), h.present],
          present: next,
          future: [],
        };
      });
      setDirty(true);
      setSaveState("idle");
    },
    [],
  );

  /* ── Undo / Redo ────────────────────────────────────────────────── */
  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      return {
        past: [...h.past, h.present],
        present: next,
        future: rest,
      };
    });
  }, []);

  /* ── Block Mutations ────────────────────────────────────────────── */
  const addBlock = useCallback(
    (type: string) => {
      const block = createBlock(type as Block["type"]);
      commit((present) => [...present, block]);
    },
    [commit],
  );

  /* ── Selection ──────────────────────────────────────────────────── */
  const selectedBlock = selectedId ? history.present.find((b) => b.id === selectedId) : null;

  const onSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  /* ── Drag & Drop ────────────────────────────────────────────────── */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [activeDrag, setActiveDrag] = useState<{
    source: string;
    label: string;
  } | null>(null);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const id = String(active.id);
      if (id.startsWith("palette:")) {
        const type = id.replace("palette:", "");
        setActiveDrag({ source: "palette", label: type });
      } else {
        setActiveDrag({
          source: "canvas",
          label: selectedBlock ? selectedBlock.type : "Block",
        });
        setSelectedId(id);
      }
    },
    [activeDrag, selectedBlock],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId.startsWith("palette:")) {
        const type = activeId.replace("palette:", "");
        const block = createBlock(type as Block["type"]);
        commit((present) => [...present, block]);
      } else {
        commit((present) => {
          const idx = present.findIndex((b) => b.id === activeId);
          if (idx >= 0) present.splice(idx, 1);
          return present;
        });
      }
    },
    [commit],
  );

  /* ── Collision Detection ──────────────────────────────────────── */
  const collisionDetection = useCallback(
    (args: any) => {
      if (activeDrag?.source === "palette") {
        return innermostPointerWithin(args);
      }
      return closestCenter(args);
    },
    [activeDrag],
  );

  /* ── Keyboard Shortcuts ─────────────────────────────────────────── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      )
        return;

      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.key === "Backspace" || e.key === "Delete") && selectedId) {
        e.preventDefault();
        // removeBlockById(selectedId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, selectedId]);

  /* ── Autosave ───────────────────────────────────────────────────── */
  const persist = useCallback(
    async (createRevision: boolean) => {
      const data = JSON.stringify({
        blocks: blocksRef.current,
        containerSettings,
      });
      if (!createRevision && data === savedRef.current) return;
      setSaveState("saving");
      const result = await onSave(templateId, data, { createRevision });
      if (result.ok) {
        savedRef.current = data;
        setSaveState("saved");
        if (createRevision) setMessage("Version saved.");
      } else {
        setSaveState("error");
        setMessage("Save failed.");
      }
    },
    [onSave, templateId, containerSettings],
  );

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void persist(false), 1500);
    return () => clearTimeout(t);
  }, [dirty, persist]);

  /* ── Viewport Classes ───────────────────────────────────────────── */
  const viewportCls =
    viewport === "mobile"
      ? "mx-auto max-w-[390px]"
      : viewport === "tablet"
        ? "mx-auto max-w-[768px]"
        : "mx-auto w-full";

  return (
    <div className="mt-4">
      {/* ── TOOLBAR ──────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2">
        <span className="text-sm font-medium text-zinc-700">
          📄 Product Template:
        </span>
        <span className="text-sm text-zinc-900">{templateName}</span>

        <div className="ml-4 flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5">
          {(["desktop", "tablet", "mobile"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewport(v)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                viewport === v
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {v === "desktop" ? "🖥 Desktop" : v === "tablet" ? "💻 Tablet" : "📱 Mobile"}
            </button>
          ))}
        </div>

        <div className="ml-4 flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5">
          {(["visual", "structure"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              aria-pressed={viewMode === v}
              title={v === "visual" ? "Visual editor (like the public site)" : "Structural outline"}
              className={`rounded px-3 py-1 text-xs font-medium ${
                viewMode === v
                  ? "bg-amber-600 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {v === "visual" ? "🌐 Visual" : "◇ Structure"}
            </button>
          ))}
        </div>

        <div className="ml-4 text-xs text-zinc-500">
          {containerSettings.width === "boxed" ? `Boxed ${containerSettings.maxWidth}px` : "Full Width"}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={undo}
            disabled={history.past.length === 0}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
            title="Undo"
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={history.future.length === 0}
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
            title="Redo"
          >
            ↷
          </button>

          <span className="text-xs text-zinc-400">
            {saveState === "saving" && "Saving..."}
            {saveState === "saved" && "Saved"}
            {saveState === "error" && "Error"}
          </span>

          <button
            onClick={() => void persist(true)}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            Save Version
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────── */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="flex gap-8">
          {/* Canvas */}
          <div className="min-w-0 flex-1">
            <div className={viewportCls}>
              {viewMode === "visual" ? (
                <ProductTemplateCanvas
                  blocks={blocks}
                  renderLive={true}
                  onSelect={onSelect}
                  onRemove={() => {}}
                />
              ) : (
                <ProductTemplateCanvas
                  blocks={blocks}
                  viewport={viewport}
                  onSelect={onSelect}
                  onRemove={() => {}}
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 shrink-0 space-y-4">
            <ProductTemplatePalette onAdd={addBlock} />

            {selectedBlock && (
              <div className="p-3 rounded-lg border border-zinc-200 bg-white">
                <p className="text-xs text-zinc-500">Block selected: {selectedBlock.type}</p>
                <button
                  onClick={() => setSelectedId(null)}
                  className="mt-2 text-xs text-zinc-400"
                >
                  Deselect
                </button>
              </div>
            )}

            {showAssignments && (
              <div className="rounded-lg border border-zinc-200 bg-white">
                <p className="text-[11px] text-zinc-500">
                  {isDefault ? "This is the global default template." : "No assignments configured."}
                </p>
              </div>
            )}
          </div>
        </div>
      </DndContext>
    </div>
  );
}
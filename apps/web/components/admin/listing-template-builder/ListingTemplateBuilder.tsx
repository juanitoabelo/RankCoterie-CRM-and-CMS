"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { createLayoutBlock, createSingleColumnRow, isRowBlock } from "@/lib/page-builder/types";
import {
  createListingTemplateBlock,
  type ListingTemplateBlock,
  type ContainerSettings,
  DEFAULT_CONTAINER_SETTINGS,
} from "@/lib/listing-templates/tree-types";
import {
  findBlock,
  findColumnForBlock,
  columnById,
  rowIdForColumn,
  moveBlock,
  addBlockFromPalette,
  insertLayoutBlock,
  removeBlock,
  duplicateBlock,
  updateBlockProps,
  updateColumnProps,
  removeColumnFromRow,
  duplicateColumn,
  flattenIds,
  addRowToSection,
  normalizeDropTarget,
} from "@/lib/page-builder/tree";
import { innermostPointerWithin } from "@/lib/page-builder/collision";
import { buildListingViewContext } from "@/components/site/listing/listing-view-model";
import ListingTemplateTreeRenderer, {
  ListingDataContext,
  ListingTemplateBlockRenderer,
} from "@/components/site/listing/ListingTemplateTreeRenderer";
import { blockLabel } from "@/components/admin/visual-editor/labels";
import BlogTemplateCanvas from "@/components/admin/blog-template-builder/BlogTemplateCanvas";
import ContainerSettingsEditor from "@/components/admin/blog-template-builder/ContainerSettingsEditor";
import { SliderPreviewProvider } from "@/components/admin/page-builder/ContentSliderFrontend";
import ColumnEditor from "@/components/admin/header-footer-builder/ColumnEditor";
import ListingTemplateVisualPreview, { type ListingPreviewOption } from "./ListingTemplateVisualPreview";
import ListingTemplatePalette from "./ListingTemplatePalette";
import ListingTemplateEditor from "./ListingTemplateEditor";
import { createSampleListingRow, SAMPLE_REGION_ROWS } from "./sample";

type SaveResult = { ok: true } | { ok: false; error: string };

interface Props {
  templateId: string;
  templateName: string;
  initialBlocks: Block[];
  initialContainerSettings?: ContainerSettings;
  isDefault: boolean;
  previewListings?: ListingPreviewOption[];
  themeColors?: Array<{ key: string; label: string; color: string }>;
  onSave: (id: string, data: string) => Promise<SaveResult>;
}

export default function ListingTemplateBuilder({
  templateId,
  templateName,
  initialBlocks,
  initialContainerSettings,
  isDefault,
  previewListings = [],
  themeColors,
  onSave,
}: Props) {
  /* ── State ──────────────────────────────────────────────────────── */
  const [history, setHistory] = useState<{
    past: Block[][];
    present: Block[];
    future: Block[][];
  }>({ past: [], present: initialBlocks, future: [] });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [displayMode, setDisplayMode] = useState<"structure" | "visual">("structure");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [containerSettings, setContainerSettings] = useState<ContainerSettings>(
    initialContainerSettings ?? DEFAULT_CONTAINER_SETTINGS,
  );
  const savedRef = useRef(JSON.stringify({ blocks: initialBlocks, containerSettings: initialContainerSettings ?? DEFAULT_CONTAINER_SETTINGS }));
  const blocksRef = useRef(history.present);

  const blocks = history.present;

  /** Sample listing ctx so structure-canvas leaf previews show real content. */
  const sampleCtx = useMemo(
    () => buildListingViewContext(createSampleListingRow(), SAMPLE_REGION_ROWS, "http://localhost:3000"),
    [],
  );

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

  /* ── Selection ──────────────────────────────────────────────────── */
  const selectedBlock = selectedId ? findBlock(blocks, selectedId) : null;

  const selectedColumnRow = selectedColumnId
    ? findBlock(blocks, rowIdForColumn(blocks, selectedColumnId) ?? "")
    : null;

  const onSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    setSelectedColumnId(null);
  }, []);

  const onSelectColumn = useCallback((columnId: string | null) => {
    setSelectedColumnId(columnId);
    setSelectedId(null);
  }, []);

  /* ── Block Mutations ────────────────────────────────────────────── */
  const addBlock = useCallback(
    (type: string) => {
      const block = createListingTemplateBlock(type);
      commit((present) =>
        addBlockFromPalette(present, block as Block, selectedColumnId ?? undefined),
      );
    },
    [selectedColumnId, commit],
  );

  const addBlockToColumn = useCallback(
    (columnId: string, type: import("@/lib/page-builder/types").BlockType) => {
      const block = createListingTemplateBlock(type);
      commit((present) => addBlockFromPalette(present, block as Block, columnId));
    },
    [commit],
  );

  const addLayout = useCallback(
    (layoutId: string) => {
      const block = createLayoutBlock(layoutId);
      commit((present) =>
        addBlockFromPalette(present, block, selectedColumnId ?? undefined),
      );
    },
    [selectedColumnId, commit],
  );

  const removeBlockById = useCallback(
    (id: string) => {
      commit((present) => removeBlock(present, id));
      setSelectedId(null);
      setSelectedColumnId(null);
    },
    [commit],
  );

  const duplicateBlockById = useCallback(
    (id: string) => {
      commit((present) => duplicateBlock(present, id));
    },
    [commit],
  );

  const updateProps = useCallback(
    (id: string, props: ListingTemplateBlock["props"]) => {
      commit((present) => updateBlockProps(present, id, props as Block["props"]));
    },
    [commit],
  );

  const updateColumn = useCallback(
    (columnId: string, patch: Record<string, unknown>) => {
      commit((present) =>
        updateColumnProps(present, columnId, patch as Partial<import("@/lib/page-builder/types").ColumnData>),
      );
    },
    [commit],
  );

  const removeColumn = useCallback(
    (columnId: string) => {
      const row = selectedColumnRow;
      if (!row || !isRowBlock(row)) return;
      if (row.props.columns.length <= 1) return;
      commit((present) => {
        const rid = rowIdForColumn(present, columnId);
        if (!rid) return present;
        return removeColumnFromRow(present, rid, columnId);
      });
      setSelectedColumnId(null);
      setSelectedId(row.id);
    },
    [commit, selectedColumnRow],
  );

  const duplicateSelectedColumn = useCallback(
    (columnId: string) => {
      const row = selectedColumnRow;
      if (!row || !isRowBlock(row)) return;
      if (row.props.columns.length >= 6) return;
      const newId = crypto.randomUUID();
      commit((present) => {
        const rid = rowIdForColumn(present, columnId);
        if (!rid) return present;
        return duplicateColumn(present, rid, columnId, 6, newId);
      });
      setSelectedColumnId(newId);
    },
    [commit, selectedColumnRow],
  );

  const addRowToSectionHandler = useCallback(
    (sectionId: string) => {
      const row = createSingleColumnRow();
      commit((present) => addRowToSection(present, sectionId, row));
    },
    [commit],
  );

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
        setActiveDrag({ source: "palette", label: blockLabel(type, type) });
      } else if (id.startsWith("layout:")) {
        setActiveDrag({ source: "layout", label: "▦ Row layout" });
      } else {
        setActiveDrag({
          source: "canvas",
          label: blockLabel(findBlock(blocksRef.current, id)?.type ?? "", "Block"),
        });
        setSelectedId(id);
        const col = findColumnForBlock(blocksRef.current, id);
        setSelectedColumnId(col?.columnId ?? null);
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);
      if (!over) return;

      const activeId = String(active.id);
      const overId = normalizeDropTarget(String(over.id));

      if (activeId.startsWith("palette:")) {
        const type = activeId.replace("palette:", "");
        const block = createListingTemplateBlock(type);
        commit((present) => addBlockFromPalette(present, block as Block, overId));
      } else if (activeId.startsWith("layout:")) {
        const layoutId = activeId.replace("layout:", "");
        commit((present) => insertLayoutBlock(present, layoutId, { overId }).blocks);
      } else {
        commit((present) => moveBlock(present, activeId, overId));
      }
    },
    [commit],
  );

  /* ── Collision Detection ──────────────────────────────────────── */
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (activeDrag?.source === "palette" || activeDrag?.source === "layout") {
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
        removeBlockById(selectedId);
      }
      if (e.key === "ArrowDown" && selectedId) {
        e.preventDefault();
        const ids = flattenIds(blocks);
        const idx = ids.indexOf(selectedId);
        if (idx < ids.length - 1) onSelect(ids[idx + 1]);
      }
      if (e.key === "ArrowUp" && selectedId) {
        e.preventDefault();
        const ids = flattenIds(blocks);
        const idx = ids.indexOf(selectedId);
        if (idx > 0) onSelect(ids[idx - 1]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, selectedId, removeBlockById, onSelect, blocks]);

  /* ── Autosave ───────────────────────────────────────────────────── */
  const persist = useCallback(async () => {
    const data = JSON.stringify({
      blocks: blocksRef.current,
      containerSettings,
    });
    if (data === savedRef.current) return;
    setSaveState("saving");
    const result = await onSave(templateId, data);
    if (result.ok) {
      savedRef.current = data;
      setSaveState("saved");
      setMessage(null);
    } else {
      setSaveState("error");
      setMessage("Save failed.");
    }
  }, [onSave, templateId, containerSettings]);

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void persist(), 1500);
    return () => clearTimeout(t);
  }, [dirty, containerSettings, persist]);

  /* ── Canvas leaf preview with sample listing data ──────────────── */
  const renderBlock = useCallback(
    (block: Block) => (
      <ListingDataContext.Provider value={sampleCtx}>
        <ListingTemplateBlockRenderer block={block} />
      </ListingDataContext.Provider>
    ),
    [sampleCtx],
  );

  /* ── Viewport Classes ───────────────────────────────────────────── */
  const viewportCls =
    viewport === "mobile"
      ? "mx-auto max-w-[390px]"
      : viewport === "tablet"
        ? "mx-auto max-w-[768px]"
        : "w-full";

  return (
    <div className="mt-4">
      {/* ── TOOLBAR ──────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2">
        <span className="text-sm font-medium text-zinc-700">🏠 Listing Template</span>
        <span className="text-sm text-zinc-900">{templateName}</span>
        {isDefault && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            Site default
          </span>
        )}

        <div className="ml-4 flex items-center gap-1 rounded-lg border border-zinc-200 p-0.5" role="group" aria-label="Template display mode">
          {(["structure", "visual"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={displayMode === mode}
              onClick={() => setDisplayMode(mode)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                displayMode === mode ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {mode === "visual" ? "Visual Display" : "Structure Display"}
            </button>
          ))}
        </div>

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
            onClick={() => void persist()}
            className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            Save
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
        <div className="flex gap-6">
          {/* Canvas */}
          <div className="min-w-0 flex-1">
            <div className={viewportCls}>
              {displayMode === "visual" ? (
                <SliderPreviewProvider>
                  <ListingTemplateVisualPreview
                    blocks={blocks}
                    containerSettings={containerSettings}
                    viewport={viewport}
                    listings={previewListings}
                  />
                </SliderPreviewProvider>
              ) : (
                <BlogTemplateCanvas
                  blocks={blocks}
                  viewport={viewport}
                  containerSettings={containerSettings}
                  selectedId={selectedId}
                  selectedColumnId={selectedColumnId}
                  onSelect={onSelect}
                  onSelectColumn={onSelectColumn}
                  onRemove={removeBlockById}
                  onDuplicate={duplicateBlockById}
                  onAddRowToSection={addRowToSectionHandler}
                  renderBlock={renderBlock}
                />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 shrink-0 space-y-4">
            <ListingTemplatePalette
              onAdd={addBlock}
              onAddLayout={addLayout}
            />

            {selectedColumnId && !selectedBlock && (() => {
              const selectedCol = columnById(blocks, selectedColumnId);
              if (!selectedCol) return null;
              return (
                <ColumnEditor
                  column={selectedCol}
                  onUpdate={(patch) => updateColumn(selectedColumnId, patch)}
                  onRemove={() => removeColumn(selectedColumnId)}
                  onDuplicate={() => duplicateSelectedColumn(selectedColumnId)}
                  themeColors={themeColors}
                />
              );
            })()}

            {!selectedBlock && !selectedColumnId && (
              <ContainerSettingsEditor
                settings={containerSettings}
                onChange={setContainerSettings}
                themeColors={themeColors}
              />
            )}

            {selectedBlock && (
              <ListingTemplateEditor
                block={selectedBlock as ListingTemplateBlock}
                onChange={(props) => updateProps(selectedBlock.id, props)}
                onRemove={() => removeBlockById(selectedBlock.id)}
                onDuplicate={() => duplicateBlockById(selectedBlock.id)}
                onUpdateColumn={updateColumn}
                onAddToColumn={addBlockToColumn}
                themeColors={themeColors}
              />
            )}

            {message && (
              <p className="rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                {message}
              </p>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag && (
            <div className="pointer-events-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 shadow-lg">
              {activeDrag.label}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

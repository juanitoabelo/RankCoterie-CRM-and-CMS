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
import type { Block, RowBlock, ColumnData, SectionBlock } from "@/lib/page-builder/types";
import { createLayoutBlock, createSingleColumnRow } from "@/lib/page-builder/types";
import {
  createGeoCategoryTemplateBlock,
  type GeoCategoryTemplateBlock,
  type GeoCategoryTemplateBlockType,
  type ContainerSettings,
  DEFAULT_CONTAINER_SETTINGS,
} from "@/lib/geo-category-template/types";
import {
  findBlock,
  findColumnForBlock,
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
import type { GeoCategoryTemplateRevisionRow } from "@/modules/geo-category-template";
import type { GeoPreviewData } from "@/lib/geo-category-template/geo-bindings";
import { innermostPointerWithin } from "@/lib/page-builder/collision";
import BlogTemplateCanvas from "../blog-template-builder/BlogTemplateCanvas";
import ContainerSettingsEditor from "../blog-template-builder/ContainerSettingsEditor";
import ColumnEditor from "../header-footer-builder/ColumnEditor";
import { blockLabel } from "@/components/admin/visual-editor/labels";
import GeoCategoryTemplateVisualPreview, { GEO_PREVIEW_SAMPLE } from "./GeoCategoryTemplateVisualPreview";
import { GeoBlockRenderer, GeoDataContext } from "./GeoCategoryTemplateRenderer";
import GeoCategoryTemplatePalette from "./GeoCategoryTemplatePalette";
import GeoCategoryTemplateEditor from "./GeoCategoryTemplateEditor";

type SaveResult = { ok: true } | { ok: false; error: string };

interface Props {
  templateId: string;
  templateName: string;
  templateLayout: "FULLWIDTH" | "SIDEBAR";
  initialBlocks: Block[];
  initialContainerSettings?: ContainerSettings;
  isDefault: boolean;
  previewCategories?: GeoPreviewData[];
  themeColors?: Array<{ key: string; label: string; color: string }>;
  onSave: (
    id: string,
    data: string,
    opts?: { createRevision?: boolean },
  ) => Promise<SaveResult>;
  onListRevisions: (id: string) => Promise<GeoCategoryTemplateRevisionRow[]>;
  onRestoreRevision: (
    id: string,
    revisionId: string,
  ) => Promise<SaveResult & { data?: string }>;
  onSaveMeta: (
    id: string,
    formData: FormData,
  ) => Promise<SaveResult>;
}

const GEO_LABELS: Record<string, string> = {
  geoHero: "Category Hero",
  geoContent: "Category Content",
  geoRegionNav: "State Links",
  geoListings: "Listings",
  geoFaq: "Category FAQ",
  geoSidebar: "Sidebar",
  geoRegionChips: "City Chips",
  geoFilterBar: "Filter Bar",
};

/* Recursive column lookup — columns live on top-level rows, rows nested inside
   sections, and rows nested inside other rows' columns. */
function findColumnDeep(blocks: Block[], columnId: string): ColumnData | null {
  for (const b of blocks) {
    if (b.type === "row") {
      const row = b as RowBlock;
      const col = row.props.columns.find((c) => c.id === columnId);
      if (col) return col;
      for (const c of row.props.columns) {
        const nested = findColumnDeep(c.blocks, columnId);
        if (nested) return nested;
      }
    } else if (b.type === "section") {
      const found = findColumnDeep((b as SectionBlock).props.rows, columnId);
      if (found) return found;
    }
  }
  return null;
}

function findRowForColumn(blocks: Block[], columnId: string): RowBlock | null {
  for (const b of blocks) {
    if (b.type === "row") {
      const row = b as RowBlock;
      if (row.props.columns.some((c) => c.id === columnId)) return row;
      for (const c of row.props.columns) {
        const nested = findRowForColumn(c.blocks, columnId);
        if (nested) return nested;
      }
    } else if (b.type === "section") {
      const found = findRowForColumn((b as SectionBlock).props.rows, columnId);
      if (found) return found;
    }
  }
  return null;
}

export default function GeoCategoryTemplateBuilder({
  templateId,
  templateName,
  templateLayout,
  initialBlocks,
  initialContainerSettings,
  isDefault,
  previewCategories = [],
  themeColors,
  onSave,
  onListRevisions,
  onRestoreRevision,
  onSaveMeta,
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
  const [revisions, setRevisions] = useState<GeoCategoryTemplateRevisionRow[]>([]);
  const [showAssignments, setShowAssignments] = useState(false);
  const [containerSettings, setContainerSettings] = useState<ContainerSettings>(
    initialContainerSettings ?? DEFAULT_CONTAINER_SETTINGS,
  );
  const savedRef = useRef(JSON.stringify(initialBlocks));
  const blocksRef = useRef(history.present);

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

  /* ── Selection ──────────────────────────────────────────────────── */
  const selectedBlock = selectedId ? findBlock(blocks, selectedId) : null;

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
      const block = createGeoCategoryTemplateBlock(type as GeoCategoryTemplateBlockType);
      commit((present) =>
        addBlockFromPalette(present, block as Block, selectedColumnId ?? undefined),
      );
    },
    [selectedColumnId, commit],
  );

  const addBlockToColumn = useCallback(
    (columnId: string, type: import("@/lib/page-builder/types").BlockType) => {
      const block = createGeoCategoryTemplateBlock(type as GeoCategoryTemplateBlockType);
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
    (id: string, props: GeoCategoryTemplateBlock["props"]) => {
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
      const row = findRowForColumn(blocks, columnId);
      if (!row || row.props.columns.length <= 1) return;
      commit((present) => removeColumnFromRow(present, row.id, columnId));
      setSelectedColumnId(null);
    },
    [blocks, commit],
  );

  const duplicateSelectedColumn = useCallback(
    (columnId: string) => {
      const row = findRowForColumn(blocks, columnId);
      if (!row) return;
      commit((present) => duplicateColumn(present, row.id, columnId));
    },
    [blocks, commit],
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
        setActiveDrag({ source: "palette", label: blockLabel(type, GEO_LABELS[type] ?? type) });
      } else if (id.startsWith("layout:")) {
        setActiveDrag({ source: "layout", label: "▦ Row layout" });
      } else {
        const blockType = findBlock(blocksRef.current, id)?.type ?? "";
        setActiveDrag({
          source: "canvas",
          label: blockLabel(blockType, GEO_LABELS[blockType] ?? "Block"),
        });
        /* Keep the canvas in sync with what is being dragged. */
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
        const block = createGeoCategoryTemplateBlock(type as GeoCategoryTemplateBlockType);
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

  /* ── Revisions ──────────────────────────────────────────────────── */
  const loadRevisions = useCallback(async () => {
    const revs = await onListRevisions(templateId);
    setRevisions(revs);
  }, [onListRevisions, templateId]);

  const restore = useCallback(
    async (revisionId: string) => {
      const result = await onRestoreRevision(templateId, revisionId);
      if (result.ok && result.data) {
        try {
          const parsed = JSON.parse(result.data);
          const restoredBlocks = Array.isArray(parsed) ? parsed : parsed.blocks;
          setHistory({ past: [], present: restoredBlocks ?? [], future: [] });
          if (!Array.isArray(parsed) && parsed.containerSettings) {
            setContainerSettings({ ...DEFAULT_CONTAINER_SETTINGS, ...parsed.containerSettings });
          }
        } catch {
          /* revision data is not parseable — leave current state */
        }
        savedRef.current = result.data;
        setMessage("Revision restored.");
        loadRevisions();
      }
    },
    [onRestoreRevision, templateId, loadRevisions],
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
        <span className="text-sm font-medium text-zinc-700">
          {templateLayout === "SIDEBAR" ? "📄 Geo Template (Right Sidebar)" : "📄 Geo Template (Fullwidth)"}
        </span>
        <span className="text-sm text-zinc-900">{templateName}</span>

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
        <div className="flex gap-6">
          {/* Canvas */}
          <div className="min-w-0 flex-1">
            <div className={viewportCls}>
              {displayMode === "visual" ? (
                <GeoCategoryTemplateVisualPreview
                  blocks={blocks}
                  containerSettings={containerSettings}
                  viewport={viewport}
                  categories={previewCategories}
                />
              ) : (
                <GeoDataContext.Provider value={GEO_PREVIEW_SAMPLE}>
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
                    renderBlock={(block) => <GeoBlockRenderer block={block} />}
                  />
                </GeoDataContext.Provider>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 shrink-0 space-y-4">
            <GeoCategoryTemplatePalette
              onAdd={addBlock}
              onAddLayout={addLayout}
            />

            {selectedColumnId && !selectedBlock && (() => {
              const selectedCol = findColumnDeep(blocks, selectedColumnId);
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
              <GeoCategoryTemplateEditor
                block={selectedBlock as GeoCategoryTemplateBlock}
                onChange={(props) => updateProps(selectedBlock.id, props)}
                onRemove={() => removeBlockById(selectedBlock.id)}
                onDuplicate={() => duplicateBlockById(selectedBlock.id)}
                onUpdateColumn={updateColumn}
                onAddToColumn={addBlockToColumn}
                allowGeoBindings
                themeColors={themeColors}
              />
            )}

            {/* Assignments Panel */}
            <div className="rounded-lg border border-zinc-200 bg-white">
              <button
                onClick={() => setShowAssignments(!showAssignments)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-700"
              >
                Assignments
                <span>{showAssignments ? "▲" : "▼"}</span>
              </button>
              {showAssignments && (
                <div className="border-t border-zinc-100 px-4 py-3">
                  <p className="text-[11px] text-zinc-500">
                    {isDefault
                      ? "This is the default template — used by every GeoCategory without an explicit assignment."
                      : "This template is not the default."}
                  </p>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Assign it to a category from that GeoCategory&apos;s edit screen
                    (&quot;Single Page Template&quot;).
                  </p>
                </div>
              )}
            </div>

            {/* Version History */}
            <div className="rounded-lg border border-zinc-200 bg-white">
              <button
                onClick={() => {
                  void loadRevisions();
                }}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-700"
              >
                Version History
                <span className="text-zinc-400">↻</span>
              </button>
              {revisions.length > 0 && (
                <div className="max-h-48 overflow-y-auto border-t border-zinc-100 px-4 py-2">
                  {revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-[11px] text-zinc-500">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={() => void restore(rev.id)}
                        className="text-[11px] text-amber-600 hover:underline"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

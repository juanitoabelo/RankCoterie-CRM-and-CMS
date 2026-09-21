"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  pointerWithin,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Block, RowBlock } from "@/lib/page-builder/types";
import {
  createRowLayout,
} from "@/lib/page-builder/types";
import {
  createBlogTemplateBlock,
  type BlogTemplateBlock,
  type BlogTemplateBlockType,
  type ContainerSettings,
  DEFAULT_CONTAINER_SETTINGS,
} from "@/lib/blog-template/types";
import {
  mapBlocks,
  findBlock,
  moveBlock,
  addBlockFromPalette,
  removeBlock,
  duplicateBlock,
  updateBlockProps,
  updateColumnProps,
  removeColumnFromRow,
  duplicateColumn,
  flattenIds,
  addRowToSection,
} from "@/lib/page-builder/tree";
import type { BlogTemplateRevisionRow } from "@/modules/blog-template";
import BlogTemplateCanvas from "./BlogTemplateCanvas";
import BlogTemplatePalette from "./BlogTemplatePalette";
import BlogTemplateEditor from "./BlogTemplateEditor";
import ContainerSettingsEditor from "./ContainerSettingsEditor";
import ColumnEditor from "../header-footer-builder/ColumnEditor";

type SaveResult = { ok: true } | { ok: false; error: string };

interface Props {
  templateId: string;
  templateName: string;
  templateType: "listing" | "single";
  initialBlocks: Block[];
  initialContainerSettings?: ContainerSettings;
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
  onListRevisions: (id: string) => Promise<BlogTemplateRevisionRow[]>;
  onRestoreRevision: (
    id: string,
    revisionId: string,
  ) => Promise<SaveResult & { data?: string }>;
  onSaveMeta: (
    id: string,
    formData: FormData,
  ) => Promise<SaveResult>;
  onSaveAssignments: (
    id: string,
    formData: FormData,
  ) => Promise<SaveResult>;
}

export default function BlogTemplateBuilder({
  templateId,
  templateName,
  templateType,
  initialBlocks,
  initialContainerSettings,
  isDefault,
  initialAssignments,
  themeColors,
  onSave,
  onListRevisions,
  onRestoreRevision,
  onSaveMeta,
  onSaveAssignments,
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
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<BlogTemplateRevisionRow[]>([]);
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
      const block = createBlogTemplateBlock(type as BlogTemplateBlockType);
      commit((present) => addBlockFromPalette(present, block as Block));
    },
    [commit],
  );

  const addLayout = useCallback(
    (layoutId: string) => {
      if (layoutId === "container") {
        const section: Block = {
          id: crypto.randomUUID(),
          type: "section",
          props: {
            rows: [],
            width: "full",
            bgColor: undefined,
            bgImage: "",
            textColor: undefined,
            paddingTop: 24,
            paddingBottom: 24,
          },
        };
        commit((present) => [...present, section]);
      } else if (layoutId === "row") {
        const row: RowBlock = {
          id: crypto.randomUUID(),
          type: "row",
          props: {
            columns: [{ id: crypto.randomUUID(), span: 12, blocks: [] }],
            gap: 24,
            align: "stretch",
            stackOnMobile: true,
            paddingY: 16,
            width: "full",
            fullWidth: true,
          },
        };
        commit((present) => [...present, row]);
      } else {
        const row = createRowLayout(layoutId);
        commit((present) => [...present, row]);
      }
    },
    [commit],
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
    (id: string, props: BlogTemplateBlock["props"]) => {
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
      const block = selectedBlock as RowBlock | undefined;
      if (!block || block.type !== "row") return;
      const col = block.props.columns.find((c) => c.id === columnId);
      if (!col || block.props.columns.length <= 1) return;
      commit((present) => removeColumnFromRow(present, block.id, columnId));
      setSelectedColumnId(null);
    },
    [selectedBlock, commit],
  );

  const duplicateSelectedColumn = useCallback(
    (columnId: string) => {
      commit((present) => duplicateColumn(present, "", columnId));
    },
    [commit],
  );

  const addRowToSectionHandler = useCallback(
    (sectionId: string) => {
      const row: RowBlock = {
        id: crypto.randomUUID(),
        type: "row",
        props: {
          columns: [{ id: crypto.randomUUID(), span: 12, blocks: [] }],
          gap: 24,
          align: "stretch",
          stackOnMobile: true,
          paddingY: 16,
          width: "full",
          fullWidth: true,
        },
      };
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
        setActiveDrag({ source: "palette", label: type });
      } else if (id.startsWith("layout:")) {
        const layoutId = id.replace("layout:", "");
        setActiveDrag({ source: "layout", label: layoutId });
      } else {
        setActiveDrag({ source: "canvas", label: id });
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
      const overId = String(over.id);

      if (activeId.startsWith("palette:")) {
        const type = activeId.replace("palette:", "");
        const block = createBlogTemplateBlock(type as BlogTemplateBlockType);
        commit((present) => addBlockFromPalette(present, block as Block, overId));
      } else if (activeId.startsWith("layout:")) {
        const layoutId = activeId.replace("layout:", "");
        const row = createRowLayout(layoutId);
        commit((present) => [...present, row]);
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
        return pointerWithin(args);
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
        const parsed = JSON.parse(result.data);
        setHistory({ past: [], present: parsed, future: [] });
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
        : "mx-auto max-w-[1200px]";

  return (
    <div className="mt-4">
      {/* ── TOOLBAR ──────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2">
        <span className="text-sm font-medium text-zinc-700">
          {templateType === "listing" ? "📄 Blog Template (Listing)" : "📄 Blog Template (Single)"}
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6">
          {/* Canvas */}
          <div className="min-w-0 flex-1">
            <div className={viewportCls}>
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
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 shrink-0 space-y-4">
            <BlogTemplatePalette
              templateType={templateType}
              onAdd={addBlock}
              onAddLayout={addLayout}
            />

            {selectedColumnId && !selectedBlock && (() => {
              let selectedCol: import("@/lib/page-builder/types").ColumnData | undefined;
              for (const block of blocks) {
                if (block.type === "row") {
                  const row = block as import("@/lib/page-builder/types").RowBlock;
                  const found = row.props.columns.find((c) => c.id === selectedColumnId);
                  if (found) { selectedCol = found; break; }
                }
              }
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
              <BlogTemplateEditor
                block={selectedBlock}
                onChange={(props) => updateProps(selectedBlock.id, props)}
                onRemove={() => removeBlockById(selectedBlock.id)}
                onDuplicate={() => duplicateBlockById(selectedBlock.id)}
                onUpdateColumn={updateColumn}
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
                      ? "This is the global default template."
                      : "No assignments configured."}
                  </p>
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Assign via the page edit screen or page type settings.
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
      </DndContext>
    </div>
  );
}

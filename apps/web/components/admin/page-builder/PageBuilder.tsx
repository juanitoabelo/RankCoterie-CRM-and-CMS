"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
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
  createRowLayout,
  isRowBlock,
  isSectionBlock,
  LAYOUT_PREFIX,
  LEAF_BLOCK_TYPES,
  PALETTE_PREFIX,
  SNIPPET_PREFIX,
  type Block,
  type BlockType,
  type ColumnData,
} from "@/lib/page-builder/types";
import {
  addBlockFromPalette,
  cloneBlock,
  columnById,
  duplicateBlock,
  findColumnForBlock,
  findBlock,
  flattenIds,
  moveBlock,
  removeBlock as removeBlockFromTree,
  duplicateColumn,
  removeColumnFromRow,
  replaceBlock,
  rowIdForColumn,
  updateBlockProps as updatePropsInTree,
  updateColumnProps,
} from "@/lib/page-builder/tree";
import { stripHtml, validateBlock } from "@/lib/page-builder/validate";
import BlockPalette, { type PaletteSnippet } from "./BlockPalette";
import BuilderCanvas from "./BuilderCanvas";
import BlockEditor from "./BlockEditor";
import ColumnEditor from "./ColumnEditor";
import { BlockPreview } from "./BlockPreview";

export interface PageRevision {
  id: string;
  createdAt: Date;
}

type SaveResult = { ok: boolean; error?: string };
type StatusResult = { ok: boolean; error?: string };
type RestoreResult = { ok: boolean; error?: string; data?: string };

function convertBlockProps(block: Block, newType: BlockType): Block["props"] {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === newType);
  if (!def) return block.props;
  const base = structuredClone(def.defaults) as Record<string, unknown>;
  const old = block.props as Record<string, unknown>;
  const strip = (v: unknown) => stripHtml(String(v ?? ""));

  for (const key of Object.keys(base)) {
    if (!(key in old)) continue;
    const a = old[key];
    const b = base[key];
    if (typeof a === typeof b || (a === null && b === null)) {
      base[key] = Array.isArray(a) ? (a as unknown[]).map((i) => ({ ...(i as object) })) : a;
    }
  }

  if (base.content === undefined && old.content !== undefined) base.content = old.content;
  if (base.content === undefined && (old.heading || old.subheading)) {
    base.content = `<p>${strip(old.heading)}</p>${old.subheading ? `<p>${strip(old.subheading)}</p>` : ""}`;
  }
  if (base.heading === undefined && old.heading !== undefined) base.heading = old.heading;
  if (base.heading === undefined && old.content) base.heading = strip(old.content);
  if (base.subheading === undefined && old.subheading !== undefined) base.subheading = old.subheading;
  if (base.body === undefined && old.body !== undefined) base.body = old.body;
  if (base.body === undefined && old.content) base.body = strip(old.content);
  if (base.buttonText === undefined && old.buttonText !== undefined) base.buttonText = old.buttonText;
  if (base.buttonUrl === undefined && old.buttonUrl !== undefined) base.buttonUrl = old.buttonUrl;
  if (base.url === undefined && old.buttonUrl !== undefined) base.url = old.buttonUrl;
  if (base.text === undefined && old.buttonText !== undefined) base.text = old.buttonText;

  return base as Block["props"];
}

function isEditableTarget(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return !!el.isContentEditable;
}

export default function PageBuilder({
  pageId,
  initialBlocks,
  initialStatus = "DRAFT",
  onSave,
  onSetStatus,
  onListRevisions,
  onRestoreRevision,
}: {
  pageId: string;
  initialBlocks: Block[];
  initialStatus?: string;
  onSave: (
    pageId: string,
    blocksJson: string,
    opts?: { createRevision?: boolean },
  ) => Promise<SaveResult>;
  onSetStatus?: (pageId: string, status: string) => Promise<StatusResult>;
  onListRevisions?: (pageId: string) => Promise<PageRevision[]>;
  onRestoreRevision?: (pageId: string, revisionId: string) => Promise<RestoreResult>;
}) {
  const [history, setHistory] = useState<{
    past: Block[][];
    present: Block[];
    future: Block[][];
  }>({ past: [], present: initialBlocks, future: [] });
  const blocks = history.present;

  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [inlineEditing, setInlineEditing] = useState(false);
  const [activeDrag, setActiveDrag] = useState<{
    source: "palette" | "layout" | "snippet" | "canvas";
    label: string;
    block?: Block;
  } | null>(null);

  // Autosave / dirty tracking
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedRef = useRef(JSON.stringify(initialBlocks));

  // Snippets
  const [snippets, setSnippets] = useState<PaletteSnippet[]>([]);
  const [fullSnippets, setFullSnippets] = useState<Array<{ id: string; name: string; block: Block }>>([]);
  const [snippetFormOpen, setSnippetFormOpen] = useState(false);
  const [snippetName, setSnippetName] = useState("");

  // Versions
  const [revisions, setRevisions] = useState<PageRevision[]>([]);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [revisionLoading, setRevisionLoading] = useState(false);

  const selectedBlock = useMemo(
    () => (selectedId ? findBlock(blocks, selectedId) : null),
    [blocks, selectedId],
  );

  const selectedColumn = useMemo(
    () => (selectedColumnId ? columnById(blocks, selectedColumnId) : null),
    [blocks, selectedColumnId],
  );

  const selectedColumnRow = useMemo(
    () => (selectedColumnId ? findBlock(blocks, rowIdForColumn(blocks, selectedColumnId) ?? "") : null),
    [blocks, selectedColumnId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const commit = useCallback((mutator: (present: Block[]) => Block[]) => {
    setHistory((h) => {
      const next = mutator(h.present);
      if (next === h.present) return h;
      return { past: [...h.past.slice(-49), h.present], present: next, future: [] };
    });
    setDirty(true);
    setSaveState("idle");
  }, []);

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
    setDirty(true);
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      return { past: [...h.past, h.present], present: next, future: rest };
    });
    setDirty(true);
  }, []);

  // ---- Selection helpers ----
  const onSelectBlock = useCallback((id: string) => {
    const col = findColumnForBlock(blocksRef.current, id);
    setSelectedColumnId(col?.column.id ?? null);
    setSelectedId(id);
  }, []);

  const onSelectColumn = useCallback((columnId: string) => {
    setSelectedColumnId(columnId);
    setSelectedId(null);
  }, []);

  // ---- Mutations ----
  const addBlock = useCallback(
    (type: BlockType) => {
      const newBlock = createBlock(type);
      if (isRowBlock(newBlock) || isSectionBlock(newBlock) || !selectedColumnId) {
        commit((prev) => [...prev, newBlock]);
      } else {
        commit((prev) => addBlockFromPalette(prev, newBlock, selectedColumnId));
      }
      setSelectedId(newBlock.id);
    },
    [selectedColumnId, commit],
  );

  const addLayout = useCallback(
    (layoutId: string) => {
      const row = createRowLayout(layoutId);
      commit((prev) => [...prev, row]);
      setSelectedId(row.id);
    },
    [commit],
  );

  const insertSnippet = useCallback(
    (snippetId: string, overId?: string) => {
      const found = fullSnippets.find((s) => s.id === snippetId);
      if (!found) return;
      const copy = cloneBlock(found.block);
      if (isRowBlock(copy) || isSectionBlock(copy)) {
        commit((prev) => [...prev, copy]);
      } else if (overId) {
        commit((prev) => addBlockFromPalette(prev, copy, overId));
      } else if (selectedColumnId) {
        commit((prev) => addBlockFromPalette(prev, copy, selectedColumnId));
      } else {
        commit((prev) => [...prev, copy]);
      }
      setSelectedId(copy.id);
    },
    [fullSnippets, selectedColumnId, commit],
  );

  const removeBlock = useCallback(
    (id: string) => {
      commit((prev) => removeBlockFromTree(prev, id));
      setSelectedId((prev) => (prev === id ? null : prev));
      setSelectedColumnId(null);
    },
    [commit],
  );

  const duplicate = useCallback(
    (id: string) => {
      commit((prev) => duplicateBlock(prev, id));
    },
    [commit],
  );

  const updateBlockProps = useCallback(
    (id: string, props: Block["props"]) => {
      commit((prev) => updatePropsInTree(prev, id, props));
    },
    [commit],
  );

  const updateColumn = useCallback(
    (columnId: string, patch: Partial<ColumnData>) => {
      commit((prev) => updateColumnProps(prev, columnId, patch));
    },
    [commit],
  );

  const removeColumn = useCallback(
    (columnId: string) => {
      const row = selectedColumnRow;
      if (!row || !isRowBlock(row)) return;
      if (row.props.columns.length <= 1) return;
      commit((prev) => {
        const rid = rowIdForColumn(prev, columnId);
        if (!rid) return prev;
        return removeColumnFromRow(prev, rid, columnId);
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
      commit((prev) => {
        const rid = rowIdForColumn(prev, columnId);
        if (!rid) return prev;
        return duplicateColumn(prev, rid, columnId, 6, newId);
      });
      setSelectedColumnId(newId);
    },
    [commit, selectedColumnRow],
  );

  const addToColumn = useCallback(
    (columnId: string, type: BlockType) => {
      const newBlock = createBlock(type);
      commit((prev) => addBlockFromPalette(prev, newBlock, columnId));
      setSelectedId(newBlock.id);
    },
    [commit],
  );

  const convert = useCallback(
    (newType: BlockType) => {
      if (!selectedId) return;
      const current = findBlock(blocksRef.current, selectedId);
      if (!current || isRowBlock(current)) return;
      const next: Block = {
        ...createBlock(newType),
        id: selectedId,
        props: convertBlockProps(current, newType),
      } as Block;
      commit((prev) => replaceBlock(prev, selectedId, next));
    },
    [selectedId, commit],
  );

  // ---- Snippets (load / save / delete) ----
  const loadSnippets = useCallback(async () => {
    try {
      const res = await fetch("/api/snippets");
      if (!res.ok) return;
      const json = (await res.json()) as {
        snippets?: Array<{ id: string; name: string; block: Block }>;
      };
      const list = json.snippets ?? [];
      setFullSnippets(list);
      setSnippets(list.map(({ id, name }) => ({ id, name })));
    } catch {
      // ignore — snippets stay hidden if unavailable
    }
  }, []);

  useEffect(() => {
    void loadSnippets();
  }, [loadSnippets]);

  const saveSnippet = useCallback(async () => {
    if (!selectedBlock) return;
    const def = BLOCK_DEFINITIONS.find((d) => d.type === selectedBlock.type);
    const name = snippetName.trim() || def?.label || "Block";
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, block: selectedBlock }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? "Failed to save snippet." });
        return;
      }
      setSnippetFormOpen(false);
      setSnippetName("");
      setMessage({ ok: true, text: "Snippet saved." });
      await loadSnippets();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to save snippet." });
    }
  }, [selectedBlock, snippetName, loadSnippets]);

  const deleteSnippet = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/snippets/${id}`, { method: "DELETE" });
        await loadSnippets();
      } catch {
        // ignore
      }
    },
    [loadSnippets],
  );

  // ---- Versions ----
  const loadRevisions = useCallback(async () => {
    if (!onListRevisions) return;
    setRevisionLoading(true);
    try {
      const rows = await onListRevisions(pageId);
      setRevisions(rows.map((r) => ({ id: r.id, createdAt: r.createdAt })));
    } finally {
      setRevisionLoading(false);
    }
  }, [onListRevisions, pageId]);

  useEffect(() => {
    if (onListRevisions) void loadRevisions();
  }, [loadRevisions, onListRevisions]);

  const restoreRevision = useCallback(
    async (revisionId: string) => {
      if (!onRestoreRevision) return;
      const res = await onRestoreRevision(pageId, revisionId);
      if (res.ok && res.data) {
        let parsed: Block[] = [];
        try {
          parsed = JSON.parse(res.data);
        } catch {
          parsed = [];
        }
        commit(() => parsed);
        setMessage({ ok: true, text: "Revision restored." });
      } else {
        setMessage({ ok: false, text: res.error ?? "Failed to restore revision." });
      }
      await loadRevisions();
    },
    [onRestoreRevision, pageId, commit, loadRevisions],
  );

  // ---- Autosave ----
  const persist = useCallback(
    async (createRevision: boolean) => {
      const data = JSON.stringify(blocksRef.current);
      if (!createRevision && data === savedRef.current) {
        setDirty(false);
        return;
      }
      setSaving(true);
      setSaveState("saving");
      try {
        const res = await onSave(pageId, data, { createRevision });
        savedRef.current = data;
        setDirty(false);
        setSaveState(res.ok ? "saved" : "error");
        if (!res.ok) setMessage({ ok: false, text: res.error ?? "Save failed." });
      } catch (e) {
        setSaveState("error");
        setMessage({ ok: false, text: e instanceof Error ? e.message : "Save failed." });
      } finally {
        setSaving(false);
      }
    },
    [onSave, pageId],
  );

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      void persist(false);
    }, 1500);
    return () => clearTimeout(t);
  }, [dirty, persist]);

  const handleSave = useCallback(() => {
    startTransition(() => {
      void persist(true);
    });
  }, [persist]);

  // ---- Status ----
  const [status, setStatus] = useState(initialStatus);
  const [statusSaving, setStatusSaving] = useState(false);

  const changeStatus = useCallback(
    async (next: string) => {
      if (!onSetStatus) return;
      setStatusSaving(true);
      try {
        const res = await onSetStatus(pageId, next);
        if (res.ok) {
          setStatus(next);
          setMessage({ ok: true, text: `Status set to ${next}.` });
        } else {
          setMessage({ ok: false, text: res.error ?? "Failed to update status." });
        }
      } catch (e) {
        setMessage({ ok: false, text: e instanceof Error ? e.message : "Failed to update status." });
      } finally {
        setStatusSaving(false);
      }
    },
    [onSetStatus, pageId],
  );

  // ---- Drag & drop ----
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith(PALETTE_PREFIX)) {
      const type = id.slice(PALETTE_PREFIX.length) as BlockType;
      const def = BLOCK_DEFINITIONS.find((d) => d.type === type);
      setActiveDrag({ source: "palette", label: `${def?.icon ?? ""} ${def?.label ?? type}` });
      return;
    }
    if (id.startsWith(LAYOUT_PREFIX)) {
      setActiveDrag({ source: "layout", label: "▦ Row layout" });
      return;
    }
    if (id.startsWith(SNIPPET_PREFIX)) {
      setActiveDrag({ source: "snippet", label: "▦ Snippet" });
      return;
    }
    const block = findBlock(blocksRef.current, id);
    if (!block) return;
    setActiveDrag({ source: "canvas", label: "", block });
    setSelectedId(id);
    const col = findColumnForBlock(blocksRef.current, id);
    setSelectedColumnId(col?.column.id ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDrag(null);
      if (!over) return;
      const activeId = String(active.id);
      const overId = String(over.id);

      if (activeId.startsWith(PALETTE_PREFIX)) {
        const type = activeId.slice(PALETTE_PREFIX.length) as BlockType;
        const newBlock = createBlock(type);
        if (isRowBlock(newBlock)) {
          commit((prev) => addBlockFromPalette(prev, newBlock, overId));
        } else {
          commit((prev) => addBlockFromPalette(prev, newBlock, overId));
        }
        setSelectedId(newBlock.id);
        return;
      }
      if (activeId.startsWith(LAYOUT_PREFIX)) {
        const row = createRowLayout(activeId.slice(LAYOUT_PREFIX.length));
        commit((prev) => [...prev, row]);
        setSelectedId(row.id);
        return;
      }
      if (activeId.startsWith(SNIPPET_PREFIX)) {
        const snippetId = activeId.slice(SNIPPET_PREFIX.length);
        const found = fullSnippets.find((s) => s.id === snippetId);
        if (found) {
          const copy = cloneBlock(found.block);
          commit((prev) => addBlockFromPalette(prev, copy, overId));
          setSelectedId(copy.id);
        }
        return;
      }

      commit((prev) => moveBlock(prev, activeId, overId));
    },
    [commit, fullSnippets],
  );

  // ---- Keyboard: undo/redo, navigation, delete ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (isEditableTarget(target)) return;

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        if (selectedId) {
          e.preventDefault();
          removeBlock(selectedId);
        }
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!selectedId) return;
        const ids = flattenIds(blocksRef.current);
        const idx = ids.indexOf(selectedId);
        if (idx === -1) return;
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const next = ids[idx + delta];
        if (next) {
          e.preventDefault();
          onSelectBlock(next);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, selectedId, removeBlock, onSelectBlock]);

  const canConvert = selectedBlock && !isRowBlock(selectedBlock);

  const viewportCls =
    viewport === "mobile" ? "mx-auto max-w-[390px]" : viewport === "tablet" ? "mx-auto max-w-[768px]" : "mx-auto max-w-[1200px]";

  const saveLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "Saved ✓"
        : saveState === "error"
          ? "Save failed"
          : dirty
            ? "Unsaved changes"
            : "Up to date";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={history.past.length === 0}
          title="Undo (⌘Z)"
          aria-label="Undo"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          ↩ Undo
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={history.future.length === 0}
          title="Redo (⌘⇧Z)"
          aria-label="Redo"
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          ↪ Redo
        </button>

        <div className="mx-1 h-5 w-px bg-zinc-200" />

        <div className="flex overflow-hidden rounded-lg border border-zinc-200">
          {(["desktop", "tablet", "mobile"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setViewport(v)}
              aria-pressed={viewport === v}
              title={`${v} preview`}
              className={`px-3 py-1.5 text-xs font-medium capitalize ${
                viewport === v ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {v === "desktop" ? "🖥 Desktop" : v === "tablet" ? "📱 Tablet" : "📲 Mobile"}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setInlineEditing((v) => !v)}
          aria-pressed={inlineEditing}
          title="Click text in the canvas to edit it directly"
          className={`rounded-lg border px-3 py-1.5 text-sm ${
            inlineEditing
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          ✎ Inline edit
        </button>

        <div className="mx-1 h-5 w-px bg-zinc-200" />

        <span className={`text-xs font-medium ${saveState === "error" ? "text-red-600" : "text-zinc-500"}`}>
          {saving ? "Saving…" : saveLabel}
        </span>

        {onSetStatus && (
          <select
            value={status}
            onChange={(e) => void changeStatus(e.target.value)}
            disabled={statusSaving}
            aria-label="Page status"
            className="ml-auto rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700"
          >
            <option value="DRAFT">Status: Draft</option>
            <option value="LIVE">Status: Live</option>
            <option value="DISABLED">Status: Disabled</option>
          </select>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        <div className="flex gap-6">
          <div className="min-w-0 flex-1">
            <div className={viewportCls}>
              <BuilderCanvas
                blocks={blocks}
                viewport={viewport}
                selectedId={selectedId}
                selectedColumnId={selectedColumnId}
                onSelect={onSelectBlock}
                onSelectColumn={onSelectColumn}
                onRemove={removeBlock}
                onDuplicate={duplicate}
                inlineEditing={inlineEditing}
                onUpdateProps={updateBlockProps}
              />
            </div>
          </div>

          <div className="w-80 shrink-0 space-y-4">
            <BlockPalette
              onAdd={addBlock}
              onAddLayout={addLayout}
              snippets={snippets}
              onAddSnippet={(id) => insertSnippet(id)}
              onDeleteSnippet={deleteSnippet}
            />

            {selectedColumnId && selectedColumn && !selectedBlock && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Edit Column
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedColumnId(null)}
                    className="text-xs text-zinc-400 hover:text-zinc-600"
                  >
                    ✕
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-zinc-400">
                  New blocks added from the palette will drop into this column.
                </p>
                <div className="mt-3 space-y-3">
                  <ColumnEditor
                    column={selectedColumn}
                    canRemove={
                      !!selectedColumnRow &&
                      isRowBlock(selectedColumnRow) &&
                      selectedColumnRow.props.columns.length > 1
                    }
                    onChange={(patch) => updateColumn(selectedColumnId, patch)}
                    onRemove={() => removeColumn(selectedColumnId)}
                    onDuplicate={() => duplicateSelectedColumn(selectedColumnId)}
                    canDuplicate={
                      !!selectedColumnRow &&
                      isRowBlock(selectedColumnRow) &&
                      selectedColumnRow.props.columns.length < 6
                    }
                  />
                </div>
              </div>
            )}

            {selectedBlock && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Edit {BLOCK_DEFINITIONS.find((d) => d.type === selectedBlock.type)?.label}
                  </h3>
                  <div className="flex items-center gap-2">
                    {canConvert && (
                      <select
                        value=""
                        onChange={(e) => {
                          const type = e.target.value as BlockType;
                          if (type) convert(type);
                        }}
                        aria-label="Convert block type"
                        title="Convert to another block type"
                        className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
                      >
                        <option value="" disabled>
                          Convert…
                        </option>
                        {LEAF_BLOCK_TYPES.filter((t) => t !== selectedBlock.type).map((t) => {
                          const def = BLOCK_DEFINITIONS.find((d) => d.type === t);
                          return (
                            <option key={t} value={t}>
                              {def?.label ?? t}
                            </option>
                          );
                        })}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSnippetFormOpen((v) => !v);
                        setSnippetName(
                          BLOCK_DEFINITIONS.find((d) => d.type === selectedBlock.type)?.label ?? "",
                        );
                      }}
                      title="Save this block as a reusable snippet"
                      className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
                    >
                      Save as snippet
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {snippetFormOpen && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={snippetName}
                      onChange={(e) => setSnippetName(e.target.value)}
                      placeholder="Snippet name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveSnippet();
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => void saveSnippet()}
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700"
                    >
                      Save
                    </button>
                  </div>
                )}

                <div className="mt-3 space-y-3">
                  <BlockEditor
                    block={selectedBlock}
                    onChange={(props) => updateBlockProps(selectedBlock.id, props)}
                    onAddToColumn={addToColumn}
                  />
                </div>

                {validateBlock(selectedBlock).length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    {validateBlock(selectedBlock).map((err, i) => (
                      <p key={i} className="text-xs text-amber-700">
                        ⚠ {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {onListRevisions && onRestoreRevision && (
              <div className="rounded-xl border border-zinc-200 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setRevisionsOpen((v) => !v);
                    if (!revisionsOpen) void loadRevisions();
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500"
                >
                  Version history
                  <span className="text-zinc-400">{revisionLoading ? "…" : revisionsOpen ? "▾" : "▸"}</span>
                </button>
                {revisionsOpen && (
                  <div className="max-h-64 space-y-1 overflow-y-auto border-t border-zinc-100 px-3 py-2">
                    {revisions.length === 0 && (
                      <p className="px-2 py-1 text-xs text-zinc-400">No saved versions yet.</p>
                    )}
                    {revisions.map((rev, i) => (
                      <div key={rev.id} className="flex items-center justify-between gap-2 px-2 py-1">
                        <span className="truncate text-xs text-zinc-600">
                          {i === 0 ? "Latest" : `Version ${new Date(rev.createdAt).toLocaleString()}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => void restoreRevision(rev.id)}
                          className="shrink-0 text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
              {isPending ? "Saving…" : "Save page & version"}
            </button>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDrag && (
            <div className="pointer-events-none rounded-lg border border-zinc-300 bg-white shadow-lg">
              {activeDrag.block ? (
                <div className="w-72">
                  <BlockPreview block={activeDrag.block} />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700">
                  {activeDrag.label}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
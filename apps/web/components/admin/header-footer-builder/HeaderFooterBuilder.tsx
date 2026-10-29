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
import type { Block, BlockType, RowBlock, SectionBlock } from "@/lib/page-builder/types";
import { createLayoutBlock, createSingleColumnRow, isRowBlock, isSectionBlock } from "@/lib/page-builder/types";
import {
  createHeaderFooterBlock,
  type HeaderFooterBlock,
  type HeaderFooterBlockType,
  type ContainerSettings,
  type AdvancedMenuPanel,
  DEFAULT_CONTAINER_SETTINGS,
} from "@/lib/header-footer/types";
import {
  mapBlocks,
  findBlock,
  findColumnForBlock,
  columnById,
  rowIdForColumn,
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
  normalizeDropTarget,
} from "@/lib/page-builder/tree";
import type { HeaderFooterRevisionRow } from "@/modules/header-footer";
import { innermostPointerWithin } from "@/lib/page-builder/collision";
import HeaderFooterCanvas from "./HeaderFooterCanvas";
import HeaderFooterRenderer, {
  type MenuData,
} from "./HeaderFooterRenderer";
import VisualEditorCanvas from "@/components/admin/visual-editor/VisualEditorCanvas";
import { blockLabel } from "@/components/admin/visual-editor/labels";
import HeaderFooterPalette from "./HeaderFooterPalette";
import HeaderFooterEditor from "./HeaderFooterEditor";
import MobilePanelCanvas from "./MobilePanelCanvas";
import DropdownPanelsCanvas from "./DropdownPanelsCanvas";
import ContainerSettingsEditor from "./ContainerSettingsEditor";
import ColumnEditor from "./ColumnEditor";

type SaveResult = { ok: true } | { ok: false; error: string };

/* ── Nested layout-tree helpers (mobile panel / dropdown panel content) ── */

function firstColumnIdInTree(blocks: Block[]): string | null {
  for (const b of blocks) {
    if (isSectionBlock(b)) {
      for (const r of b.props.rows) {
        const id = r.props.columns[0]?.id ?? null;
        if (id) return id;
      }
    } else if (isRowBlock(b)) {
      const id = b.props.columns[0]?.id ?? null;
      if (id) return id;
    }
  }
  return null;
}

function addLeafToColumnInRow(row: RowBlock, colId: string, child: Block): RowBlock {
  return {
    ...row,
    props: {
      ...row.props,
      columns: row.props.columns.map((c) =>
        c.id === colId ? { ...c, blocks: [...c.blocks, child] } : c,
      ),
    },
  } as RowBlock;
}

function addLeafToColumnInTree(blocks: Block[], colId: string, child: Block): Block[] {
  return blocks.map((b) => {
    if (isSectionBlock(b)) {
      return {
        ...b,
        props: { ...b.props, rows: b.props.rows.map((r) => addLeafToColumnInRow(r, colId, child)) },
      } as Block;
    }
    if (isRowBlock(b)) return addLeafToColumnInRow(b, colId, child) as Block;
    return b;
  });
}

/**
 * Insert a palette/layout block into a nested layout tree (mobile panel or
 * dropdown panel). Sections and rows append at the tree root; leaf blocks go
 * into `colId` (or the first column), scaffolding a section/row when empty.
 */
function insertIntoLayoutTree(tree: Block[], child: Block, colId?: string): Block[] {
  if (isSectionBlock(child) || isRowBlock(child)) return [...tree, child];
  const target = colId ?? firstColumnIdInTree(tree);
  if (target) return addLeafToColumnInTree(tree, target, child);
  const row = createSingleColumnRow() as RowBlock;
  const rowWithChild = {
    ...row,
    props: {
      ...row.props,
      columns: row.props.columns.map((c, i) => (i === 0 ? { ...c, blocks: [child] } : c)),
    },
  } as RowBlock;
  const section = createLayoutBlock("section") as SectionBlock;
  return [{ ...section, props: { ...section.props, rows: [rowWithChild] } } as Block, ...tree];
}

function normalizePanels(raw: unknown): AdvancedMenuPanel[] {
  if (Array.isArray(raw)) return raw as AdvancedMenuPanel[];
  return Object.entries((raw ?? {}) as Record<string, AdvancedMenuPanel>).map(([key, p]) => ({
    ...p,
    id: p.id ?? key,
    assignedItemId: p.assignedItemId ?? key,
  }));
}

type NestedTarget = {
  blockId: string;
  panelId?: string;
  colId?: string;
};

/**
 * Locate which nested tree (mobile layout or a dropdown panel) owns `id` —
 * a block or column id that does not exist in the main header/footer tree.
 */
function locateNestedTarget(blocks: Block[], id: string): NestedTarget | null {
  for (const b of blocks) {
    if (b.type !== "advancedMenu") continue;
    const props = b.props as Record<string, unknown>;
    const mobile = (props.mobileLayout as Block[]) ?? [];
    const mobileCol = columnById(mobile, id);
    const mobileBlock = findColumnForBlock(mobile, id);
    if (mobileCol || mobileBlock) {
      return { blockId: b.id, colId: mobileCol?.id ?? mobileBlock?.columnId };
    }
    if (findBlock(mobile, id)) return { blockId: b.id };

    for (const p of normalizePanels(props.dropdownPanels)) {
      const tree = (p.blocks as Block[]) ?? [];
      const col = columnById(tree, id);
      const blk = findColumnForBlock(tree, id);
      if (col || blk) return { blockId: b.id, panelId: p.id, colId: col?.id ?? blk?.columnId };
      if (findBlock(tree, id)) return { blockId: b.id, panelId: p.id };
    }
  }
  return null;
}

interface Props {
  templateId: string;
  templateName: string;
  templateType: "HEADER" | "FOOTER";
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
  menus?: MenuData;
  onSave: (
    id: string,
    data: string,
    opts?: { createRevision?: boolean },
  ) => Promise<SaveResult>;
  onListRevisions: (id: string) => Promise<HeaderFooterRevisionRow[]>;
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

export default function HeaderFooterBuilder({
  templateId,
  templateName,
  templateType,
  initialBlocks,
  initialContainerSettings,
  isDefault,
  initialAssignments,
  themeColors,
  menus = {},
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
  const [viewMode, setViewMode] = useState<"visual" | "structure">("visual");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<HeaderFooterRevisionRow[]>([]);
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
      const block = createHeaderFooterBlock(type as HeaderFooterBlockType);
      commit((present) =>
        addBlockFromPalette(present, block as Block, selectedColumnId ?? undefined),
      );
    },
    [selectedColumnId, commit],
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
    (id: string, props: HeaderFooterBlock["props"]) => {
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

/* ── Advanced Menu mobile layout mutations ──────────────────────────── */
  const updateMobileLayout = useCallback(
    (blockId: string, updater: (blocks: Block[]) => Block[]) => {
      commit((present) =>
        mapBlocks(present, (b) => {
          if (b.id !== blockId || b.type !== "advancedMenu") return b;
          const props = b.props as Record<string, unknown>;
          // Support legacy mobileBlocks key.
          const current = (props.mobileLayout as Block[]) ?? (props.mobileBlocks as Block[]) ?? [];
          return { ...b, props: { ...props, mobileLayout: updater(current) } } as Block;
        }),
      );
    },
    [commit],
  );

  /* ── Advanced Menu dropdown panel mutations ─────────────────────────── */
  const updateDropdownPanels = useCallback(
    (blockId: string, updater: (panels: AdvancedMenuPanel[]) => AdvancedMenuPanel[]) => {
      commit((present) =>
        mapBlocks(present, (b) => {
          if (b.id !== blockId || b.type !== "advancedMenu") return b;
          const props = b.props as Record<string, unknown>;
          // Support both old (object) and new (array) formats
          const currentRaw = props.dropdownPanels;
          const current = Array.isArray(currentRaw)
            ? (currentRaw as AdvancedMenuPanel[])
            : Object.entries(currentRaw ?? {}).map(([key, p]) => ({ ...p, id: p.id ?? key, assignedItemId: p.assignedItemId ?? key })) as AdvancedMenuPanel[];
          return { ...b, props: { ...props, dropdownPanels: updater(current) } } as Block;
        }),
      );
    },
    [commit],
  );

  const addDropdownPanel = useCallback(
    (blockId: string, panel: AdvancedMenuPanel) => {
      updateDropdownPanels(blockId, (panels) => [...panels, panel]);
    },
    [updateDropdownPanels],
  );

  const removeDropdownPanel = useCallback(
    (blockId: string, panelId: string) => {
      updateDropdownPanels(blockId, (panels) => panels.filter((p) => p.id !== panelId));
    },
    [updateDropdownPanels],
  );

  const updateDropdownPanel = useCallback(
    (blockId: string, panelId: string, patch: Partial<AdvancedMenuPanel>) => {
      updateDropdownPanels(blockId, (panels) =>
        panels.map((p) => (p.id === panelId ? { ...p, ...patch } : p)),
      );
    },
    [updateDropdownPanels],
  );

  const updatePanelLayout = useCallback(
    (blockId: string, panelId: string, updater: (blocks: Block[]) => Block[]) => {
      updateDropdownPanels(blockId, (panels) =>
        panels.map((p) =>
          p.id === panelId
            ? { ...p, layout: "blocks" as const, blocks: updater(p.blocks ?? []) }
            : p,
        ),
      );
    },
    [updateDropdownPanels],
  );

  /* ── Move adjacent (up/down) ─────────────────────────────────────── */
  const moveAdjacent = useCallback(
    (id: string, dir: -1 | 1) => {
      const ids = flattenIds(blocksRef.current);
      const idx = ids.indexOf(id);
      const next = ids[idx + dir];
      if (!next) return;
      commit((present) => moveBlock(present, id, next));
      setSelectedId(next);
      setSelectedColumnId(null);
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
        /* Keep the live canvas in sync with what is being dragged. */
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

      // Create the dragged palette/layout block, if any.
      const draggedChild: Block | null = activeId.startsWith("palette:")
        ? (createHeaderFooterBlock(
            activeId.replace("palette:", "") as HeaderFooterBlockType,
          ) as unknown as Block)
        : activeId.startsWith("layout:")
          ? createLayoutBlock(activeId.replace("layout:", ""))
          : null;

      /* Drop onto an Advanced Menu's mobile layout zone.
         Ids: <prefix>:<blockId>[:col:<colId>|root|card]
         Prefixes: advmobilec: (canvas editor) | advmenu-mobile: (sidebar editor) */
      const mobilePrefix = overId.startsWith("advmobilec:")
        ? "advmobilec:"
        : overId.startsWith("advmenu-mobile:")
          ? "advmenu-mobile:"
          : null;
      if (overId && mobilePrefix) {
        const segs = overId.slice(mobilePrefix.length).split(":");
        const blockId = segs[0];
        const colId = segs[1] === "col" ? segs[2] : undefined;
        if (draggedChild) {
          const child = draggedChild;
          updateMobileLayout(blockId, (tree) => insertIntoLayoutTree(tree, child, colId));
        }
        return;
      }

      /* Drop onto a dropdown panel zone — canvas (advpanelc:) or sidebar (advpanel:).
         Ids: <prefix>:<blockId>:<panelId|first>[:col:<colId>|root|card] */
      const panelPrefix =
        overId && overId.startsWith("advpanelc:")
          ? "advpanelc:"
          : overId && overId.startsWith("advpanel:")
            ? "advpanel:"
            : null;
      if (overId && panelPrefix) {
        const segs = overId.slice(panelPrefix.length).split(":");
        const blockId = segs[0];
        const rawPanelId = segs[1];
        const colId = segs[2] === "col" ? segs[3] : undefined;
        if (draggedChild) {
          const child = draggedChild;
          updateDropdownPanels(blockId, (panels) => {
            const target =
              rawPanelId === "first"
                ? panels[0]
                : panels.find((p) => p.id === rawPanelId);
            if (!target) return panels;
            return panels.map((p) =>
              p.id === target.id
                ? {
                    ...p,
                    layout: "blocks" as const,
                    blocks: insertIntoLayoutTree((p.blocks ?? []) as Block[], child, colId),
                  }
                : p,
            );
          });
        }
        return;
      }

      if (draggedChild) {
        const child = draggedChild;
        commit((present) => {
          // Drop onto nested content rendered in the editing preview (mobile
          // panel / dropdown panel blocks) — route into that nested tree
          // instead of letting it fall to the main tree root.
          if (
            overId &&
            !findBlock(present, overId) &&
            !columnById(present, overId) &&
            !present.some((b) => b.id === overId)
          ) {
            const nested = locateNestedTarget(present, overId);
            if (nested) {
              return mapBlocks(present, (b) => {
                if (b.id !== nested.blockId) return b;
                const props = b.props as Record<string, unknown>;
                if (!nested.panelId) {
                  const mobile = (props.mobileLayout as Block[]) ?? [];
                  return {
                    ...b,
                    props: { ...props, mobileLayout: insertIntoLayoutTree(mobile, child, nested.colId) },
                  } as Block;
                }
                const panels = normalizePanels(props.dropdownPanels);
                return {
                  ...b,
                  props: {
                    ...props,
                    dropdownPanels: panels.map((p) =>
                      p.id === nested.panelId
                        ? {
                            ...p,
                            layout: "blocks" as const,
                            blocks: insertIntoLayoutTree(
                              (p.blocks ?? []) as Block[],
                              child,
                              nested.colId,
                            ),
                          }
                        : p,
                    ),
                  },
                } as Block;
              });
            }
          }
          return addBlockFromPalette(present, child, overId);
        });
      } else {
        commit((present) => moveBlock(present, activeId, overId));
      }
    },
    [commit, updateMobileLayout, updateDropdownPanels],
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
        : "mx-auto w-full";

  // Flatten top-level + first-level children so any link can be assigned a panel.
  const menuItemOptions = [...(menus.header ?? []), ...(menus.footer ?? [])].flatMap((m) => [
    { id: m.id, label: m.label },
    ...(m.children ?? []).map((c) => ({ id: c.id, label: `${m.label} / ${c.label}` })),
  ]);

  return (
    <div className="mt-4">
      {/* ── TOOLBAR ──────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2">
        <span className="text-sm font-medium text-zinc-700">
          {templateType === "HEADER" ? "🟦 Header" : "🟩 Footer"}:
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
                <VisualEditorCanvas
                  blocks={blocks}
                  renderLive={
                    <>
                      <HeaderFooterRenderer
                        blocks={blocks as HeaderFooterBlock[]}
                        containerSettings={containerSettings}
                        menus={menus}
                        previewViewport={viewport}
                      />
                      <MobilePanelCanvas
                        blocks={blocks}
                        onMobileLayoutChange={updateMobileLayout}
                      />
                      <DropdownPanelsCanvas
                        blocks={blocks}
                        onPanelLayoutChange={updatePanelLayout}
                        onPanelSettingsChange={updateDropdownPanel}
                        menuItems={menuItemOptions}
                      />
                    </>
                  }
                  emptyHint={`Drag blocks from the palette to build your ${templateType === "HEADER" ? "header" : "footer"}`}
                  selectedId={selectedId}
                  selectedColumnId={selectedColumnId}
                  onSelect={onSelect}
                  onSelectColumn={onSelectColumn}
                  onRemove={removeBlockById}
                  onDuplicate={duplicateBlockById}
                  onMove={moveAdjacent}
                  onAddRowToSection={addRowToSectionHandler}
                  onEditText={(id, props) =>
                    updateProps(id, props as HeaderFooterBlock["props"])
                  }
                />
              ) : (
                <>
                  <HeaderFooterCanvas
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
                  <MobilePanelCanvas
                    blocks={blocks}
                    onMobileLayoutChange={updateMobileLayout}
                  />
                  <DropdownPanelsCanvas
                    blocks={blocks}
                    onPanelLayoutChange={updatePanelLayout}
                    onPanelSettingsChange={updateDropdownPanel}
                    menuItems={menuItemOptions}
                  />
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 shrink-0 space-y-4">
            <HeaderFooterPalette
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
                kind={templateType}
              />
            )}

            {selectedBlock && (
              <HeaderFooterEditor
                block={selectedBlock as HeaderFooterBlock}
                onChange={(props) => updateProps(selectedBlock.id, props)}
                onRemove={() => removeBlockById(selectedBlock.id)}
                onDuplicate={() => duplicateBlockById(selectedBlock.id)}
                onUpdateColumn={updateColumn}
                themeColors={themeColors}
                updateMobileLayout={updateMobileLayout}
                updateDropdownPanels={updateDropdownPanels}
                addDropdownPanel={addDropdownPanel}
                removeDropdownPanel={removeDropdownPanel}
                updateDropdownPanel={updateDropdownPanel}
                updatePanelLayout={updatePanelLayout}
                menuItems={
                  ((selectedBlock.props as Record<string, unknown>).menuId as string) === "footer"
                    ? menus.footer ?? []
                    : menus.header ?? []
                }
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

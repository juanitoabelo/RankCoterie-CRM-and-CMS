"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { reorderMenuItems, type ActionResult } from "../actions";
import Link from "next/link";
import {
  applyDrop,
  buildGroups,
  hasChildren,
  resolveDrop,
  toRows,
  type DropTarget,
  type NestMenuItem,
  type Row,
} from "@/modules/menus/nesting";

type MenuItem = NestMenuItem;

interface MenuItemsSortableProps {
  menuId: string;
  menuName: string;
  items: MenuItem[];
}

function SortableItem({
  row,
  isChild,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  row: Row;
  isChild: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, item: MenuItem) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, row: Row) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  const { item } = row;
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, row)}
      onDrop={onDrop}
      className={[
        "flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors",
        isChild ? "ml-8 border-l-2 border-l-amber-400" : "",
        isDragging ? "z-50 opacity-50 shadow-lg" : "",
        isDropTarget ? "border-amber-400 bg-amber-50/50" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden
        className="cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isChild && (
          <span className="text-xs font-medium text-amber-600" aria-hidden>
            ↳
          </span>
        )}
        <div className="min-w-0 truncate">
          <span className="font-medium text-zinc-900">{item.label}</span>
          <span className="ml-2 text-xs text-zinc-500">{item.href}</span>
        </div>
      </div>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
        {item.itemType}
      </span>
      <Link
        href={`/admin/menus/items/${item.id}/edit`}
        draggable={false}
        className="text-sm text-blue-600 hover:underline"
      >
        Edit
      </Link>
    </div>
  );
}

function DropLine({ depth }: { depth: 0 | 1 }) {
  return (
    <div className={depth === 1 ? "ml-8 py-1" : "py-1"} aria-hidden>
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="h-0.5 flex-1 rounded bg-amber-500" />
        {depth === 1 && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-amber-600">
            sub item
          </span>
        )}
      </div>
    </div>
  );
}

export default function MenuItemsSortable({
  menuId,
  items,
}: MenuItemsSortableProps) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const [dirty, setDirty] = useState(false);

  const groups = useMemo(() => buildGroups(localItems), [localItems]);
  const rows = useMemo(() => toRows(groups), [groups]);

  const indicator = useMemo(() => {
    if (!drop) return null;
    const indexOf = (id?: string) =>
      id ? rows.findIndex((r) => r.item.id === id) : -1;
    if (drop.mode === "before") {
      const i = indexOf(drop.groupRootId);
      return i >= 0 ? { index: i, depth: 0 as const } : null;
    }
    if (drop.mode === "rootAfter" || drop.mode === "childEnd") {
      let last = -1;
      rows.forEach((r, i) => {
        if (drop.groupRootId && r.groupRootId === drop.groupRootId) last = i;
      });
      return last >= 0
        ? { index: last + 1, depth: drop.mode === "childEnd" ? (1 as const) : (0 as const) }
        : null;
    }
    if (drop.mode === "childBefore") {
      const i = indexOf(drop.afterId);
      return i >= 0 ? { index: i, depth: 1 as const } : null;
    }
    if (drop.mode === "childAfter") {
      const i = indexOf(drop.afterId);
      return i >= 0 ? { index: i + 1, depth: 1 as const } : null;
    }
    if (drop.mode === "rootEnd") {
      return { index: rows.length, depth: 0 as const };
    }
    return null;
  }, [drop, rows]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, item: MenuItem) {
    setDragId(item.id);
    setMessage(null);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
  }

  function handleDragEnd() {
    setDragId(null);
    setDrop(null);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, row: Row) {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    setDrop(
      resolveDrop(localItems, row, dragId, e.clientY, rect.top, rect.height),
    );
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!drop || !dragId) return;
    const next = applyDrop(localItems, dragId, drop);
    if (next) {
      setLocalItems(next);
      setDirty(true);
    }
    setDrop(null);
    setDragId(null);
  }

  function handleBottomDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDrop({ mode: "rootEnd" });
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const itemOrders = localItems.map((item, index) => ({
        id: item.id,
        order: item.order ?? index,
        parentId: item.parentId ?? null,
      }));
      const res = await reorderMenuItems(menuId, itemOrders);
      setMessage(res);
      if (res.ok) setDirty(false);
    });
  }

  return (
    <div>
      {message && (
        <p className={`mb-4 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Menu saved." : message.error}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">
            Menu Items
            <span className="ml-2 text-xs font-normal text-zinc-400">
              drag to reorder — drop below a parent to make it a sub item
            </span>
          </h2>
          {dirty && <p className="mt-1 text-xs text-amber-600">Unsaved changes</p>}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save Menu"}
        </button>
      </div>

      {localItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center">
          <p className="text-sm text-zinc-400">No items yet.</p>
          <Link
            href={`/admin/menus/new?menu=${menuId}`}
            className="mt-2 inline-block text-sm font-medium text-amber-600 hover:underline"
          >
            Add your first item
          </Link>
        </div>
      ) : (
        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
          <div className="space-y-2">
            {rows.map((row, index) => (
              <Fragment key={row.item.id}>
                {indicator?.index === index && <DropLine depth={indicator.depth} />}
                <SortableItem
                  row={row}
                  isChild={row.depth === 1}
                  isDragging={dragId === row.item.id}
                  isDropTarget={
                    !!drop &&
                    dragId !== row.item.id &&
                    (drop.mode === "childEnd" || drop.mode === "rootAfter") &&
                    drop.groupRootId === row.groupRootId &&
                    row.depth === 0
                  }
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              </Fragment>
            ))}
            {indicator?.index === rows.length && <DropLine depth={indicator.depth} />}
          </div>

          {dragId && (
            <div
              onDragOver={handleBottomDragOver}
              onDrop={handleDrop}
              className={`mt-2 rounded-lg border border-dashed p-3 text-center text-xs transition-colors ${
                drop?.mode === "rootEnd"
                  ? "border-amber-500 bg-amber-50 text-amber-700"
                  : "border-zinc-300 text-zinc-400"
              }`}
            >
              Drop here to make it a top-level item
            </div>
          )}

          <p className="mt-3 text-xs text-zinc-500">
            Max one submenu level. Drop a sub item on the top half of a top-level item to
            move it back up.
          </p>
        </div>
      )}
    </div>
  );
}

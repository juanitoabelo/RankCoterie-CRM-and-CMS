"use client";

import { useState, useTransition } from "react";
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderMenuItems, type ActionResult } from "../actions";
import Link from "next/link";

interface MenuItem {
  id: string;
  label: string;
  href: string;
  order: number;
  itemType: string;
  parentId?: string | null;
}

interface MenuItemsSortableProps {
  menuId: string;
  menuName: string;
  items: MenuItem[];
}

function SortableItem({
  item,
  isChild,
}: {
  item: MenuItem;
  isChild: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 ${
        isDragging ? "z-50 shadow-lg" : ""
      } ${isChild ? "ml-8 border-l-2 border-l-zinc-300" : ""}`}
    >
      <button
        type="button"
        className="cursor-grab text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <div className="flex-1 truncate">
        <span className="font-medium text-zinc-900">{item.label}</span>
        <span className="ml-2 text-xs text-zinc-500">{item.href}</span>
      </div>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
        {item.itemType}
      </span>
      <Link
        href={`/admin/menus/items/${item.id}/edit`}
        className="text-sm text-blue-600 hover:underline"
      >
        Edit
      </Link>
    </div>
  );
}

export default function MenuItemsSortable({
  menuId,
  menuName,
  items,
}: MenuItemsSortableProps) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localItems, setLocalItems] = useState(items);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalItems((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const itemOrders = localItems.map((item, index) => ({
        id: item.id,
        order: index,
        parentId: item.parentId,
      }));
      const res = await reorderMenuItems(menuId, itemOrders);
      setMessage(res);
    });
  }

  // Separate root items and child items
  const rootItems = localItems.filter((item) => !item.parentId);
  const childItems = localItems.filter((item) => item.parentId);

  return (
    <div>
      {message && (
        <p className={`mb-4 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Order saved." : message.error}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-900">
          Menu Items
          <span className="ml-2 text-xs text-zinc-400">(drag to reorder)</span>
        </h2>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "Save Order"}
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rootItems.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {rootItems.map((item) => (
                <SortableItem key={item.id} item={item} isChild={false} />
              ))}
            </div>
          </SortableContext>

          {childItems.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                Nested Items
              </h3>
              <SortableContext
                items={childItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {childItems.map((item) => (
                    <SortableItem key={item.id} item={item} isChild={true} />
                  ))}
                </div>
              </SortableContext>
            </div>
          )}
        </DndContext>
      )}
    </div>
  );
}

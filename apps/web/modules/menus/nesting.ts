/**
 * Pure nesting/reordering logic for the admin menu builder.
 *
 * WordPress-style behaviour, limited to two levels (the public menu renderer
 * supports one dropdown level):
 * - hover the upper half of a top-level item → insert before it at root level
 * - hover the lower half of a top-level item → nest underneath it
 * - hover a sub item → reorder within its parent
 * - drop on the bottom zone → move to the root, at the end
 */

export interface NestMenuItem {
  id: string;
  label: string;
  href: string;
  order: number;
  itemType: string;
  parentId?: string | null;
}

export interface Group {
  root: NestMenuItem;
  children: NestMenuItem[];
}

export type NestDropMode =
  | "before"
  | "rootAfter"
  | "rootEnd"
  | "childBefore"
  | "childAfter"
  | "childEnd";

export interface DropTarget {
  mode: NestDropMode;
  groupRootId?: string;
  afterId?: string;
}

export interface Row {
  item: NestMenuItem;
  depth: 0 | 1;
  groupRootId: string;
}

export function byOrder(a: NestMenuItem, b: NestMenuItem) {
  return a.order - b.order || a.label.localeCompare(b.label);
}

export function buildGroups(items: NestMenuItem[]): Group[] {
  const roots = items.filter((i) => !i.parentId).sort(byOrder);
  const rootIds = new Set(roots.map((r) => r.id));
  const orphans = items
    .filter((i) => i.parentId && !rootIds.has(i.parentId))
    .sort(byOrder);
  return [...roots, ...orphans].map((root) => ({
    root,
    children: items.filter((i) => i.parentId === root.id).sort(byOrder),
  }));
}

export function toRows(groups: Group[]): Row[] {
  return groups.flatMap((g) => [
    { item: g.root, depth: 0 as const, groupRootId: g.root.id },
    ...g.children.map((c) => ({
      item: c,
      depth: 1 as const,
      groupRootId: g.root.id,
    })),
  ]);
}

export function hasChildren(items: NestMenuItem[], id: string): boolean {
  return items.some((i) => i.parentId === id);
}

/**
 * Decide what a hover over `row` means. Returns null when the hover should be
 * ignored (dragging an item over itself or over its own group).
 */
export function resolveDrop(
  items: NestMenuItem[],
  row: Row,
  dragId: string,
  pointerY: number,
  rectTop: number,
  rectHeight: number,
): DropTarget | null {
  if (dragId === row.item.id) return null;

  const groupRootId = row.groupRootId;
  if (groupRootId === dragId) return null;

  const lower = pointerY > rectTop + rectHeight / 2;
  const dragHasChildren = hasChildren(items, dragId);

  if (row.depth === 0) {
    if (!lower) return { mode: "before", groupRootId };
    // Lower half of a parent nests the dragged item; a parent that already has
    // children cannot be nested (that would create a third level).
    if (!dragHasChildren) return { mode: "childEnd", groupRootId };
    return { mode: "rootAfter", groupRootId };
  }

  if (dragHasChildren) return { mode: "rootAfter", groupRootId };
  return lower
    ? { mode: "childAfter", groupRootId, afterId: row.item.id }
    : { mode: "childBefore", groupRootId, afterId: row.item.id };
}

/**
 * Apply a drop target and return the new flat list with normalised orders.
 * Returns null when the move is not possible.
 */
export function applyDrop(
  items: NestMenuItem[],
  dragId: string,
  target: DropTarget,
): NestMenuItem[] | null {
  const dragged = items.find((i) => i.id === dragId);
  if (!dragged) return null;

  const draggedChildren = items.filter((i) => i.parentId === dragged.id);
  const isChildDrop =
    target.mode === "childEnd" ||
    target.mode === "childAfter" ||
    target.mode === "childBefore";

  if (isChildDrop && draggedChildren.length > 0) return null;

  const nextGroups: Group[] = buildGroups(items)
    .filter((g) => g.root.id !== dragged.id)
    .map((g) => ({
      root: g.root,
      children: g.children.filter((c) => c.id !== dragged.id),
    }));

  if (isChildDrop) {
    const group = nextGroups.find((g) => g.root.id === target.groupRootId);
    if (!group) return null;
    const moved: NestMenuItem = { ...dragged, parentId: group.root.id };
    if (target.mode === "childEnd") {
      group.children = [...group.children, moved];
    } else {
      const at = group.children.findIndex((c) => c.id === target.afterId);
      const insertAt =
        target.mode === "childAfter"
          ? at < 0
            ? group.children.length
            : at + 1
          : at < 0
            ? group.children.length
            : at;
      group.children.splice(insertAt, 0, moved);
    }
  } else {
    const moved: NestMenuItem = { ...dragged, parentId: null };
    const group: Group = { root: moved, children: draggedChildren };
    if (target.mode === "rootEnd") {
      nextGroups.push(group);
    } else {
      const at = nextGroups.findIndex((g) => g.root.id === target.groupRootId);
      const insertAt =
        target.mode === "rootAfter"
          ? at < 0
            ? nextGroups.length
            : at + 1
          : at < 0
            ? nextGroups.length
            : at;
      nextGroups.splice(insertAt, 0, group);
    }
  }

  const flat: NestMenuItem[] = [];
  nextGroups.forEach((g, groupIndex) => {
    flat.push({ ...g.root, parentId: null, order: groupIndex });
    g.children.forEach((child, childIndex) => {
      flat.push({ ...child, parentId: g.root.id, order: childIndex });
    });
  });
  return flat;
}

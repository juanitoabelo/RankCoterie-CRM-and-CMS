import type { Collision, CollisionDetection } from "@dnd-kit/core";

type DetectionArgs = Parameters<CollisionDetection>[0];

/**
 * Pointer collision detection that resolves to the *innermost* droppable under
 * the pointer.
 *
 * The stock `pointerWithin` cannot be used directly here. It returns every
 * droppable whose rect contains the pointer, and dnd-kit then picks the winner
 * with `getFirstCollision`, which sorts by rect area **descending** — i.e. the
 * largest containing rect wins. Since the canvas root is registered as a
 * droppable spanning the whole editor, it is always the largest, so a plain
 * `pointerWithin` would resolve every palette drop to the canvas root and dump
 * every new block at the top of the tree.
 *
 * Sorting ascending by area picks the smallest element that still contains the
 * pointer, which is the block/row/column the user is actually aiming at, and
 * falls back to the canvas root only when nothing more specific matches. A single
 * collision is returned so `getFirstCollision` is bypassed.
 */
export function innermostPointerWithin({
  droppableContainers,
  droppableRects,
  pointerCoordinates,
}: DetectionArgs): Collision[] {
  if (!pointerCoordinates) return [];

  let best: Collision | null = null;
  let bestArea = Number.POSITIVE_INFINITY;

  for (const container of droppableContainers) {
    const rect = droppableRects.get(container.id);
    if (!rect || rect.width <= 0 || rect.height <= 0) continue;

    const { left, top, width, height } = rect;
    if (
      pointerCoordinates.x < left ||
      pointerCoordinates.x > left + width ||
      pointerCoordinates.y < top ||
      pointerCoordinates.y > top + height
    ) {
      continue;
    }

    const area = width * height;
    if (area < bestArea) {
      bestArea = area;
      best = { id: container.id, data: container.data.current };
    }
  }

  return best ? [best] : [];
}

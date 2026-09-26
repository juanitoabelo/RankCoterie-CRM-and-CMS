import { describe, expect, it } from "vitest";
import { innermostPointerWithin } from "./collision";
import { CANVAS_ROOT_ID } from "./types";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Build the `CollisionDetection` args for a pointer at (x, y) over `rects`. */
function argsAt(
  x: number,
  y: number,
  rects: Record<string, Rect>,
): Parameters<typeof innermostPointerWithin>[0] {
  const droppableRects = new Map<string, Rect>();
  const droppableContainers = Object.keys(rects).map((id) => {
    droppableRects.set(id, rects[id]);
    return { id, data: { current: { droppable: { id } } } };
  });

  return {
    active: { id: "active", data: { current: {} }, rect: { current: { width: 0, height: 0, left: x, top: y } } },
    collisionRect: { width: 0, height: 0, left: x, top: y },
    droppableRects,
    droppableContainers,
    pointerCoordinates: { x, y },
  } as unknown as Parameters<typeof innermostPointerWithin>[0];
}

describe("innermostPointerWithin", () => {
  /* A canvas root spanning everything, with a block nested inside it. */
  const nested = {
    [CANVAS_ROOT_ID]: { left: 0, top: 0, width: 1200, height: 400 },
    "col-1": { left: 20, top: 20, width: 1160, height: 200 },
    "block-1": { left: 40, top: 40, width: 400, height: 60 },
  };

  it("resolves to the smallest element containing the pointer", () => {
    expect(innermostPointerWithin(argsAt(60, 60, nested))).toEqual([
      { id: "block-1", data: { droppable: { id: "block-1" } } },
    ]);
    expect(innermostPointerWithin(argsAt(500, 100, nested))).toEqual([
      { id: "col-1", data: { droppable: { id: "col-1" } } },
    ]);
  });

  it("never resolves to the canvas root while a nested element is under the pointer", () => {
    // The canvas root is the largest rect, so a naive largest-wins resolver would
    // answer "__canvas__" here and append the block to the top of the tree.
    const [collision] = innermostPointerWithin(argsAt(60, 60, nested));
    expect(String(collision.id)).not.toBe(CANVAS_ROOT_ID);
  });

  it("falls back to the canvas root over empty canvas space", () => {
    expect(innermostPointerWithin(argsAt(600, 350, nested))).toEqual([
      { id: CANVAS_ROOT_ID, data: { droppable: { id: CANVAS_ROOT_ID } } },
    ]);
  });

  it("returns the canvas root for an empty canvas", () => {
    const empty = { [CANVAS_ROOT_ID]: { left: 0, top: 0, width: 800, height: 280 } };
    expect(innermostPointerWithin(argsAt(400, 140, empty))).toHaveLength(1);
    expect(String(innermostPointerWithin(argsAt(400, 140, empty))[0].id)).toBe(CANVAS_ROOT_ID);
  });

  it("returns no collision when the pointer is outside every droppable", () => {
    expect(innermostPointerWithin(argsAt(2000, 2000, nested))).toEqual([]);
  });

  it("returns no collision without pointer coordinates", () => {
    const args = argsAt(60, 60, nested);
    expect(innermostPointerWithin({ ...args, pointerCoordinates: null })).toEqual([]);
  });

  it("ignores zero-area droppables", () => {
    const collapsed = {
      [CANVAS_ROOT_ID]: { left: 0, top: 0, width: 800, height: 280 },
      "empty-col": { left: 0, top: 0, width: 0, height: 0 },
    };
    expect(String(innermostPointerWithin(argsAt(10, 10, collapsed))[0].id)).toBe(CANVAS_ROOT_ID);
  });
});

import { describe, expect, it } from "vitest";
import {
  applyDrop,
  buildGroups,
  resolveDrop,
  toRows,
  type NestMenuItem,
} from "../nesting";

function item(
  id: string,
  order: number,
  parentId: string | null = null,
): NestMenuItem {
  return { id, label: id, href: `/${id}`, order, itemType: "LINK", parentId };
}

const flat: NestMenuItem[] = [
  item("home", 0),
  item("about", 1),
  item("team", 0, "about"),
  item("services", 2),
  item("contact", 3),
];

describe("menu nesting", () => {
  it("builds two-level groups from a flat list", () => {
    const groups = buildGroups(flat);
    expect(groups.map((g) => g.root.id)).toEqual([
      "home",
      "about",
      "services",
      "contact",
    ]);
    expect(groups[1].children.map((c) => c.id)).toEqual(["team"]);
    expect(toRows(groups).map((r) => `${r.depth}:${r.item.id}`)).toEqual([
      "0:home",
      "0:about",
      "1:team",
      "0:services",
      "0:contact",
    ]);
  });

  it("nests when hovering the lower half of a top-level item", () => {
    const row = toRows(buildGroups(flat))[0];
    expect(resolveDrop(flat, row, "services", 80, 0, 100)).toEqual({
      mode: "childEnd",
      groupRootId: "home",
    });
  });

  it("inserts before a top-level item when hovering its upper half", () => {
    const row = toRows(buildGroups(flat))[0];
    expect(resolveDrop(flat, row, "contact", 10, 0, 100)).toEqual({
      mode: "before",
      groupRootId: "home",
    });
  });

  it("refuses to nest a parent that already has children", () => {
    const row = toRows(buildGroups(flat))[0];
    expect(resolveDrop(flat, row, "about", 80, 0, 100)).toEqual({
      mode: "rootAfter",
      groupRootId: "home",
    });
  });

  it("ignores hovering the dragged item or its own group", () => {
    const rows = toRows(buildGroups(flat));
    expect(resolveDrop(flat, rows[0], "home", 80, 0, 100)).toBeNull();
    expect(resolveDrop(flat, rows[2], "about", 80, 0, 100)).toBeNull();
  });

  it("nests an item and normalises orders", () => {
    const next = applyDrop(flat, "services", {
      mode: "childEnd",
      groupRootId: "about",
    });
    expect(next).not.toBeNull();
    const byId = Object.fromEntries(next!.map((i) => [i.id, i]));
    expect(byId.services.parentId).toBe("about");
    expect(byId.team.parentId).toBe("about");
    expect(byId.services.order).toBe(1);
    expect(byId.home.parentId).toBeNull();
  });

  it("moves a sub item back to the root", () => {
    const next = applyDrop(flat, "team", { mode: "rootEnd" });
    expect(next!.find((i) => i.id === "team")!.parentId).toBeNull();
    expect(next!.at(-1)!.id).toBe("team");
  });

  it("reorders sub items within the same parent", () => {
    const next = applyDrop(flat, "team", {
      mode: "childAfter",
      groupRootId: "about",
      afterId: "team",
    });
    expect(next!.find((i) => i.id === "team")!.parentId).toBe("about");
  });

  it("keeps children attached when a parent moves", () => {
    const next = applyDrop(flat, "about", { mode: "rootEnd" });
    const team = next!.find((i) => i.id === "team")!;
    expect(team.parentId).toBe("about");
    expect(next!.at(-1)!.id).toBe("team");
  });

  it("refuses to nest an item that has children", () => {
    expect(
      applyDrop(flat, "about", { mode: "childEnd", groupRootId: "home" }),
    ).toBeNull();
  });
});

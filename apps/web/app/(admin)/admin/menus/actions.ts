"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import { MENU_LOCATIONS } from "./constants";
import type { MenuLocation } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function listMenuItems() {
  await requireSection("menus");
  return prisma.menuItem.findMany({
    where: { menu: { tenantId: TENANT_ID } },
    include: {
      menu: { select: { id: true, name: true, location: true } },
      parent: { select: { id: true, label: true } },
    },
    orderBy: [{ order: "asc" }, { label: "asc" }],
  });
}

export async function getMenuItem(id: string) {
  await requireSection("menus");
  return prisma.menuItem.findFirst({
    where: { id, menu: { tenantId: TENANT_ID } },
    include: {
      menu: { select: { id: true, name: true, location: true } },
      parent: { select: { id: true, label: true } },
    },
  });
}

export async function getMenuOptions() {
  await requireSection("menus");
  return prisma.menu.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });
}

export async function listMenusWithCounts() {
  await requireSection("menus");
  return prisma.menu.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: [{ location: "asc" }, { name: "asc" }],
  });
}

export async function getParentItemOptions(menuId: string) {
  await requireSection("menus");
  return prisma.menuItem.findMany({
    where: { menuId, parentId: null },
    orderBy: { order: "asc" },
    select: { id: true, label: true },
  });
}

export async function createMenuItem(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("menus");
  const menuId = String(formData.get("menuId") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const itemType = String(formData.get("itemType") ?? "LINK").trim();
  const target = String(formData.get("target") ?? "").trim() || null;

  if (!menuId) return { ok: false, error: "Menu is required." };
  if (!label) return { ok: false, error: "Item text is required." };

  try {
    // Get the next order number
    const maxOrder = await prisma.menuItem.aggregate({
      where: { menuId },
      _max: { order: true },
    });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    await prisma.menuItem.create({
      data: {
        menuId,
        parentId: parentId || null,
        label,
        href: href || "#",
        order: nextOrder,
        itemType: itemType === "FEED" ? "FEED" : "LINK",
        target,
      },
    });
    await logAudit({ action: "MENU_UPDATE", entity: "MenuItem", entityId: label, actorId: actor.id });
    revalidatePath("/admin/menus");
    revalidatePath("/admin/menus/new");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create menu item." };
  }
}

export async function updateMenuItem(id: string, formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("menus");
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const label = String(formData.get("label") ?? "").trim();
  const href = String(formData.get("href") ?? "").trim();
  const order = Number(formData.get("order") ?? 0);
  const itemType = String(formData.get("itemType") ?? "LINK").trim();
  const target = String(formData.get("target") ?? "").trim() || null;

  if (!label) return { ok: false, error: "Item text is required." };

  try {
    await prisma.menuItem.update({
      where: { id },
      data: {
        parentId: parentId || null,
        label,
        href: href || "#",
        order: Number.isFinite(order) ? order : 0,
        itemType: itemType === "FEED" ? "FEED" : "LINK",
        target,
      },
    });
    await logAudit({ action: "MENU_UPDATE", entity: "MenuItem", entityId: id, actorId: actor.id });
    revalidatePath("/admin/menus");
    revalidatePath(`/admin/menus/items/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update menu item." };
  }
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  const actor = await requireSection("menus");
  try {
    await prisma.menuItem.delete({ where: { id } });
    await logAudit({ action: "MENU_DELETE", entity: "MenuItem", entityId: id, actorId: actor.id });
    revalidatePath("/admin/menus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete menu item." };
  }
}

export async function deleteMenu(id: string): Promise<ActionResult> {
  const actor = await requireSection("menus");
  try {
    await prisma.menu.deleteMany({ where: { id, tenantId: TENANT_ID } });
    await logAudit({ action: "MENU_DELETE", entity: "Menu", entityId: id, actorId: actor.id });
    revalidatePath("/admin/menus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete menu." };
  }
}

export async function getMenu(id: string) {
  await requireSection("menus");
  return prisma.menu.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      items: { orderBy: { order: "asc" } },
    },
  });
}

export async function reorderMenuItems(
  menuId: string,
  itemOrders: { id: string; order: number; parentId?: string | null }[]
): Promise<ActionResult> {
  const actor = await requireSection("menus");
  try {
    // Update each item's order and parent in a transaction
    await prisma.$transaction(
      itemOrders.map((item) =>
        prisma.menuItem.update({
          where: { id: item.id },
          data: {
            order: item.order,
            parentId: item.parentId ?? null,
          },
        })
      )
    );
    await logAudit({ action: "MENU_UPDATE", entity: "Menu", entityId: menuId, actorId: actor.id });
    revalidatePath("/admin/menus");
    revalidatePath(`/admin/menus/${menuId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to reorder items." };
  }
}

export async function saveMenuItemsForm(formData: FormData): Promise<void> {
  const actor = await requireSection("menus");
  const menuId = String(formData.get("menuId") ?? "").trim();
  if (!menuId) return;

  const labels = formData.getAll("itemLabel").map((v) => String(v).trim());
  const hrefs = formData.getAll("itemHref").map((v) => String(v).trim());
  const itemTypes = formData.getAll("itemType").map((v) => String(v).trim());

  // Delete existing items and re-create from form data
  await prisma.menuItem.deleteMany({ where: { menuId } });

  const items = labels
    .map((label, i) => ({
      label,
      href: hrefs[i] || "#",
      itemType: (itemTypes[i] === "FEED" ? "FEED" : "LINK") as "LINK" | "FEED",
    }))
    .filter((item) => item.label.length > 0);

  if (items.length > 0) {
    await prisma.menuItem.createMany({
      data: items.map((item, i) => ({
        menuId,
        label: item.label,
        href: item.href,
        itemType: item.itemType,
        order: i,
      })),
    });
  }

  await logAudit({ action: "MENU_UPDATE", entity: "Menu", entityId: menuId, actorId: actor.id });
  revalidatePath("/admin/menus");
  revalidatePath(`/admin/menus/${menuId}`);
}

export async function deleteMenuForm(formData: FormData): Promise<void> {
  const actor = await requireSection("menus");
  const menuId = String(formData.get("menuId") ?? "").trim();
  if (!menuId) return;

  await prisma.menuItem.deleteMany({ where: { menuId } });
  await prisma.menu.deleteMany({ where: { id: menuId, tenantId: TENANT_ID } });
  await logAudit({ action: "MENU_DELETE", entity: "Menu", entityId: menuId, actorId: actor.id });
  revalidatePath("/admin/menus");
}

export async function createMenu(formData: FormData): Promise<ActionResult> {
  const actor = await requireSection("menus");
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "HEADER").trim();

  if (!name) return { ok: false, error: "Menu name is required." };

  try {
    await prisma.menu.create({
      data: {
        tenantId: TENANT_ID,
        name,
        location: location as MenuLocation,
      },
    });
    await logAudit({ action: "MENU_UPDATE", entity: "Menu", entityId: name, actorId: actor.id });
    revalidatePath("/admin/menus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create menu." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { MenuLocation } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/lib/admin-auth";

export type ActionResult = { ok: true } | { ok: false; error: string };

const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";
export const MENU_LOCATIONS: MenuLocation[] = [MenuLocation.HEADER, MenuLocation.FOOTER, MenuLocation.SIDEBAR];

export const MENU_LOCATION_LABELS: Record<MenuLocation, string> = {
  HEADER: "Header",
  FOOTER: "Footer",
  SIDEBAR: "Sidebar",
};

export async function actorId(): Promise<string | null> {
  const u = await requireSection("menus");
  return u.id;
}

export async function listMenus() {
  await requireSection("menus");
  return prisma.menu.findMany({
    where: { tenantId: TENANT_ID },
    include: { _count: { select: { items: true } } },
    orderBy: { location: "asc" },
  });
}

export async function getMenu(id: string) {
  await requireSection("menus");
  return prisma.menu.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: { items: { orderBy: { order: "asc" } } },
  });
}

export async function createMenu(formData: FormData): Promise<ActionResult> {
  const actor = await actorId();
  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "HEADER") as MenuLocation;
  if (!name) return { ok: false, error: "Menu name is required." };
  try {
    if (!MENU_LOCATIONS.includes(location)) return { ok: false, error: "Invalid menu location." };
    await prisma.menu.create({ data: { tenantId: TENANT_ID, name, location } });
    await logAudit({ action: "MENU_CREATE", entity: "Menu", entityId: name, actorId: actor });
    revalidatePath("/admin/menus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create menu." };
  }
}

export async function createMenuForm(formData: FormData): Promise<void> {
  await createMenu(formData);
}

export async function saveMenuItems(menuId: string, formData: FormData): Promise<ActionResult> {
  const actor = await actorId();
  const labels = formData.getAll("itemLabel").map((v) => String(v).trim());
  const hrefs = formData.getAll("itemHref").map((v) => String(v).trim());
  try {
    await prisma.$transaction(async (tx) => {
      const menu = await tx.menu.findFirst({ where: { id: menuId, tenantId: TENANT_ID } });
      if (!menu) throw new Error("Menu not found.");
      await tx.menuItem.deleteMany({ where: { menuId } });
      const rows = labels
        .map((label, i) => ({
          label,
          href: hrefs[i] ?? "",
          order: i,
        }))
        .filter((r) => r.label && r.href);
      if (rows.length) {
        await tx.menuItem.createMany({ data: rows.map((r) => ({ ...r, menuId })) });
      }
    });
    await logAudit({ action: "MENU_UPDATE", entity: "Menu", entityId: menuId, actorId: actor });
    revalidatePath(`/admin/menus/${menuId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to save menu items." };
  }
}

export async function saveMenuItemsForm(formData: FormData): Promise<void> {
  const id = String(formData.get("menuId") ?? "");
  await saveMenuItems(id, formData);
}

export async function deleteMenu(id: string): Promise<ActionResult> {
  const actor = await actorId();
  try {
    await prisma.menu.deleteMany({ where: { id, tenantId: TENANT_ID } });
    await logAudit({ action: "MENU_DELETE", entity: "Menu", entityId: id, actorId: actor });
    revalidatePath("/admin/menus");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete menu." };
  }
}

export async function deleteMenuForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await deleteMenu(id);
}

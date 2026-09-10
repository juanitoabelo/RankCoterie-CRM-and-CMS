import { MenuLocation } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };
export const MENU_LOCATIONS: MenuLocation[] = [MenuLocation.HEADER, MenuLocation.FOOTER, MenuLocation.SIDEBAR];

export const MENU_LOCATION_LABELS: Record<MenuLocation, string> = {
  HEADER: "Header",
  FOOTER: "Footer",
  SIDEBAR: "Sidebar",
};

/**
 * Menus Module — Public API
 * 
 * Provides menu management for navigation menus.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getMenus, getMenuByLocation } from "@/modules/menus";
 * 
 * const menus = await getMenus();
 * const headerMenu = await getMenuByLocation("HEADER");
 * ```
 */

// Types
/** Menu location type */
export type { MenuLocation } from "./types";
/** Menu item type */
export type { MenuItem } from "./types";
/** Menu with items */
export type { MenuWithItems } from "./types";
/** Menu filter options */
export type { MenuFilter } from "./types";

// Queries
/** Get all menus */
export { getMenus } from "./queries";
/** Get a single menu by ID */
export { getMenuById } from "./queries";
/** Get a menu by location */
export { getMenuByLocation } from "./queries";

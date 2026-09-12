/**
 * Menus Module — Types
 * 
 * Defines types for menu management.
 */

/** Menu location */
export type MenuLocation = "HEADER" | "FOOTER" | "SIDEBAR";

/** Menu item */
export interface MenuItem {
  id: string;
  label: string;
  href: string;
  target: string | null;
  order: number;
  children?: MenuItem[];
}

/** Menu with items */
export interface MenuWithItems {
  id: string;
  name: string;
  location: MenuLocation;
  items: MenuItem[];
  createdAt: Date;
}

/** Menu query filters */
export interface MenuFilter {
  location?: MenuLocation;
  search?: string;
}

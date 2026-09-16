/**
 * Auth Module — Permissions
 * 
 * Role-based access control for admin sections.
 */
import { Role } from "@prisma/client";
import type { AdminUser, SectionRoles } from "./types";

/** Role-based access to admin sections. SUPER_ADMIN is implicit everywhere. */
const SECTION_ROLES: SectionRoles = {
  dashboard: ["SUPER_ADMIN", "ADMIN", "EDITOR", "MARKETING", "REVIEWER", "SALES_REP"],
  topics: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  sections: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  articles: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  pages: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  templates: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  geoImages: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  menus: ["SUPER_ADMIN", "ADMIN", "EDITOR"],
  regions: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  widgets: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  general: ["SUPER_ADMIN", "ADMIN"],
  reading: ["SUPER_ADMIN", "ADMIN"],
  themeSettings: ["SUPER_ADMIN", "ADMIN"],
  headerFooter: ["SUPER_ADMIN", "ADMIN"],
  styleGuide: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  exclusions: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  feeds: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  reports: ["SUPER_ADMIN", "ADMIN", "MARKETING"],
  myCompany: ["SUPER_ADMIN", "ADMIN"],
  users: ["SUPER_ADMIN"],
  leads: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  clients: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  invoices: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  merchants: ["SUPER_ADMIN", "ADMIN", "SALES_REP"],
  listings: ["SUPER_ADMIN", "ADMIN", "REVIEWER"],
  reviewQueue: ["SUPER_ADMIN", "ADMIN", "REVIEWER"],
};

/** Check if user is a Super Admin */
export function isSuperAdmin(user: Pick<AdminUser, "roles">): boolean {
  return user.roles.includes(Role.SUPER_ADMIN);
}

/** Check if user can access a specific section */
export function canAccessSection(
  user: Pick<AdminUser, "roles">,
  sectionKey: string,
): boolean {
  if (isSuperAdmin(user)) return true;
  const allowed = SECTION_ROLES[sectionKey];
  if (!allowed) return false;
  return user.roles.some((r) => allowed.includes(r));
}

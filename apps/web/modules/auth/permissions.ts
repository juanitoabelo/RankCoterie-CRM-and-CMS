/**
 * Auth Module — Permissions
 *
 * Role-based access control for admin sections, with optional per-role
 * overrides stored in ToolPermissionOverride. Overrides are keyed by:
 *   `${role}::section:<section>` or `${role}::tool:<toolKey>`
 *
 * Resolution order (per role):
 *   1. explicit per-link override
 *   2. explicit section-level override
 *   3. built-in default from DEFAULT_SECTION_ROLES
 * SUPER_ADMIN always has access.
 */
import { Role } from "@prisma/client";
import type { AdminUser, SectionRoles } from "./types";
import { DEFAULT_SECTION_ROLES } from "./tools";

/** Role-based access to admin sections. SUPER_ADMIN is implicit everywhere. */
const SECTION_ROLES = DEFAULT_SECTION_ROLES as unknown as SectionRoles;

/** Persisted overrides keyed by `${role}::${target}`. */
export type ToolPermissionOverrides = Record<string, boolean>;

function overrideFor(
  overrides: ToolPermissionOverrides,
  role: Role,
  target: string,
): boolean | undefined {
  return overrides[`${role}::${target}`];
}

/** Check if user is a Super Admin */
export function isSuperAdmin(user: Pick<AdminUser, "roles">): boolean {
  return user.roles.includes(Role.SUPER_ADMIN);
}

/** Check if user is a directory subscriber (self-service My Listing only). */
export function isSubscriberOnly(user: Pick<AdminUser, "roles">): boolean {
  return user.roles.length === 1 && user.roles[0] === Role.SUBSCRIBER;
}

/**
 * Default-only section check (no database overrides).
 * Prefer `canAccessTool` in UI/route code and `requireSection` in server code.
 */
export function canAccessSection(
  user: Pick<AdminUser, "roles">,
  sectionKey: string,
): boolean {
  if (isSuperAdmin(user)) return true;
  const allowed = SECTION_ROLES[sectionKey];
  if (!allowed) return false;
  return user.roles.some((r) => allowed.includes(r));
}

/**
 * Section-level check including persisted overrides. Used by `requireSection`
 * for server actions — hiding a section also blocks writes for that section.
 */
export function canAccessSectionWithOverrides(
  roles: readonly Role[],
  sectionKey: string,
  overrides: ToolPermissionOverrides = {},
): boolean {
  if (roles.includes(Role.SUPER_ADMIN)) return true;

  for (const role of roles) {
    const sectionOverride = overrideFor(overrides, role, `section:${sectionKey}`);
    if (sectionOverride !== undefined) {
      if (sectionOverride) return true;
      continue;
    }
    if (DEFAULT_SECTION_ROLES[sectionKey]?.includes(role)) return true;
  }
  return false;
}

/**
 * Per-link check: a link is visible if its role has an explicit tool override,
 * else the section override, else the built-in section default. A user with
 * multiple roles gets access if any of their roles allows it.
 */
export function canAccessTool(
  roles: readonly Role[],
  tool: { key: string; section: string },
  overrides: ToolPermissionOverrides = {},
): boolean {
  if (roles.includes(Role.SUPER_ADMIN)) return true;

  for (const role of roles) {
    const toolOverride = overrideFor(overrides, role, `tool:${tool.key}`);
    if (toolOverride !== undefined) {
      if (toolOverride) return true;
      continue;
    }

    const sectionOverride = overrideFor(overrides, role, `section:${tool.section}`);
    if (sectionOverride !== undefined) {
      if (sectionOverride) return true;
      continue;
    }

    if (DEFAULT_SECTION_ROLES[tool.section]?.includes(role)) return true;
  }
  return false;
}

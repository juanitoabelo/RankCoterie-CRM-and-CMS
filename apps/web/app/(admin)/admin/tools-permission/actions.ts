"use server";

/**
 * Tools Permission — server actions.
 *
 * Only SUPER_ADMIN can read or change these overrides. Section-level entries
 * ("section:products") apply to every link/content type in that section;
 * per-link entries ("tool:products.orders") override a single menu link.
 */
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import {
  ADMIN_TOOL_GROUPS,
  ALL_ADMIN_TOOLS,
  DEFAULT_SECTION_ROLES,
  SECTION_LABELS,
  sectionTarget,
  toolTarget,
} from "@/modules/auth/tools";
import { ALL_ROLES, ROLE_LABELS } from "@/modules/users/types";
import { logAudit } from "@/lib/audit";
import type {
  PermissionEntry,
  PermissionMatrixData,
  SaveResult,
  ToolGroupData,
} from "./types";

const EXCLUDED_SECTIONS = new Set(["toolsPermission"]);

function buildGroups(): ToolGroupData[] {
  return ADMIN_TOOL_GROUPS.map((group) => {
    const sections: ToolGroupData["sections"] = [];

    for (const item of group.items) {
      if (EXCLUDED_SECTIONS.has(item.section)) continue;

      let section = sections.find((entry) => entry.section === item.section);
      if (!section) {
        section = {
          section: item.section,
          label: SECTION_LABELS[item.section] ?? item.section,
          items: [],
        };
        sections.push(section);
      }
      section.items.push({
        key: item.key,
        label: item.label,
        href: item.href,
        section: item.section,
      });
    }

    return { title: group.title, sections };
  }).filter((group) => group.sections.length > 0);
}

export async function getPermissionMatrix(): Promise<PermissionMatrixData> {
  await requireSection("toolsPermission");

  const groups = buildGroups();
  const sections = Array.from(
    new Set(groups.flatMap((group) => group.sections.map((s) => s.section))),
  );
  const roles = ALL_ROLES.filter((role) => role !== Role.SUPER_ADMIN).map((role) => ({
    role,
    label: ROLE_LABELS[role] ?? role,
  }));

  const defaults: Record<string, Record<string, boolean>> = {};
  for (const { role } of roles) {
    defaults[role] = {};
    for (const section of sections) {
      defaults[role][section] = DEFAULT_SECTION_ROLES[section]?.includes(role) ?? false;
    }
  }

  const rows = await prisma.toolPermissionOverride.findMany({
    where: { tenantId: TENANT_ID },
    select: { role: true, target: true, visible: true },
  });
  const overrides: Record<string, Record<string, boolean>> = {};
  for (const row of rows) {
    if (!overrides[row.role]) overrides[row.role] = {};
    overrides[row.role][row.target] = row.visible;
  }

  return { roles, groups, defaults, overrides };
}

export async function saveRolePermissions(
  role: string,
  entries: PermissionEntry[],
): Promise<SaveResult> {
  const actor = await requireSection("toolsPermission");

  if (!(ALL_ROLES as string[]).includes(role)) {
    return { ok: false, error: "Unknown role." };
  }
  if (role === Role.SUPER_ADMIN) {
    return { ok: false, error: "Super Admin always has full access." };
  }

  const allowedTargets = new Set<string>([
    ...Object.keys(SECTION_LABELS).map(sectionTarget),
    ...ALL_ADMIN_TOOLS.map((tool) => toolTarget(tool.key)),
  ]);

  const cleaned = new Map<string, boolean>();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || typeof entry.target !== "string") continue;
    if (typeof entry.visible !== "boolean") continue;
    if (!allowedTargets.has(entry.target)) continue;
    cleaned.set(entry.target, entry.visible);
  }

  const data = Array.from(cleaned, ([target, visible]) => ({
    tenantId: TENANT_ID,
    role: role as Role,
    target,
    visible,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.toolPermissionOverride.deleteMany({
      where: { tenantId: TENANT_ID, role: role as Role },
    });
    if (data.length > 0) {
      await tx.toolPermissionOverride.createMany({ data });
    }
  });

  await logAudit({
    action: "TOOL_PERMISSION_UPDATE",
    entity: "ToolPermissionOverride",
    entityId: role,
    actorId: actor.id,
    meta: {
      role,
      entries: data.map((entry) => ({
        target: entry.target,
        visible: entry.visible,
      })),
    },
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/tools-permission");
  return { ok: true };
}

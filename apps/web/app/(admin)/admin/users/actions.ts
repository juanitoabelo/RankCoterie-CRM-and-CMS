"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/passwords";
import { TENANT_ID } from "@/lib/tenant";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const ALL_ROLES: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.EDITOR,
  Role.MARKETING,
  Role.REVIEWER,
  Role.SALES_REP,
  Role.GRACE_COACH,
];

function normalizeRoles(values: readonly FormDataEntryValue[]): Role[] {
  const set = new Set<string>();
  for (const v of values) {
    const raw = String(v);
    if (!raw || raw === "NONE") continue;
    raw.split(",").forEach((r) => {
      if ((ALL_ROLES as string[]).includes(r)) set.add(r);
    });
  }
  return ALL_ROLES.filter((r) => set.has(r));
}

async function currentSuperAdminId(): Promise<string | null> {
  const user = await requireSection("users");
  return user.id;
}

export async function listUsers() {
  await requireSection("users");
  return prisma.user.findMany({
    where: { tenantId: TENANT_ID },
    include: { roles: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const actorId = await currentSuperAdminId();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const roles = normalizeRoles(formData.getAll("roles"));

  if (!email) return { ok: false, error: "Email is required." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (roles.length === 0) return { ok: false, error: "At least one role is required." };

  try {
    const existing = await prisma.user.findFirst({
      where: { email, tenantId: TENANT_ID },
    });
    if (existing) return { ok: false, error: "A user with that email already exists." };

    await prisma.user.create({
      data: {
        tenantId: TENANT_ID,
        email,
        passwordHash: hashPassword(password),
        firstName: firstName || null,
        lastName: lastName || null,
        active: true,
        roles: { create: roles.map((role) => ({ role })) },
      },
    });
    await logAudit({
      action: "USER_CREATE",
      entity: "User",
      entityId: email,
      actorId,
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create user." };
  }
}

export async function createUserForm(formData: FormData): Promise<void> {
  await createUser(formData);
}

export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  const actorId = await currentSuperAdminId();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const newPassword = String(formData.get("password") ?? "");
  const active = formData.get("active") === "on";
  const roles = normalizeRoles(formData.getAll("roles"));

  if (!email) return { ok: false, error: "Email is required." };
  if (newPassword && newPassword.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (roles.length === 0) return { ok: false, error: "At least one role is required." };

  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({ where: { id, tenantId: TENANT_ID } });
      if (!target) throw new Error("User not found.");
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.update({
          where: { id, tenantId: TENANT_ID },
        data: {
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          active,
          ...(newPassword ? { passwordHash: hashPassword(newPassword) } : {}),
          roles: { create: roles.map((role) => ({ role })) },
        },
      });
    });
    await logAudit({
      action: "USER_UPDATE",
      entity: "User",
      entityId: email,
      actorId,
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update user." };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const actorId = await currentSuperAdminId();
  try {
    await prisma.$transaction(async (tx) => {
      const target = await tx.user.findFirst({ where: { id, tenantId: TENANT_ID } });
      if (!target) throw new Error("User not found.");
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id, tenantId: TENANT_ID } });
    });
    await logAudit({ action: "USER_DELETE", entity: "User", entityId: id, actorId });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to delete user." };
  }
}

export async function updateUserForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await updateUser(id, formData);
}

export async function deleteUserForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await deleteUser(id);
}

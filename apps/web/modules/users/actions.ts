"use server";

/**
 * Users Module — Server Actions
 * 
 * Server actions for user CRUD operations.
 */
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { hashPassword } from "@/lib/passwords";
import { TENANT_ID } from "@/modules/shared";
import { ALL_ROLES } from "./types";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function getAllRoles(): Promise<Role[]> {
  return ALL_ROLES;
}

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

export async function listUsers(search?: string, department?: string, page?: number, pageSize?: number) {
  await requireSection("users");
  const where: Record<string, unknown> = { tenantId: TENANT_ID };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (department && department !== "All") {
    where.department = department;
  }
  
  const actualPage = Math.max(1, page ?? 1);
  const actualPageSize = pageSize ?? 50;
  const skip = (actualPage - 1) * actualPageSize;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { roles: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: actualPageSize,
    }),
    prisma.user.count({ where }),
  ]);
  
  return { users, total, page: actualPage, pageSize: actualPageSize, totalPages: Math.ceil(total / actualPageSize) };
}

export async function getUser(id: string) {
  await requireSection("users");
  return prisma.user.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: { roles: true },
  });
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const actorId = await currentSuperAdminId();
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const email = str("email").toLowerCase();
  const password = str("password");
  const firstName = str("firstName");
  const lastName = str("lastName");
  const company = str("company") || null;
  const department = str("department") || null;
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
        company,
        department,
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
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const email = str("email").toLowerCase();
  const firstName = str("firstName");
  const lastName = str("lastName");
  const company = str("company") || null;
  const department = str("department") || null;
  const jobTitle = str("jobTitle") || null;
  const phone = str("phone") || null;
  const authorUrl = str("authorUrl") || null;
  const authorBio = str("authorBio") || null;
  const imageUrl = str("imageUrl") || null;
  const newPassword = str("password");
  const active = formData.get("active") === "on";
  const includeInStaffPages = formData.get("includeInStaffPages") === "on";
  const staffPageOrHomePage = str("staffPageOrHomePage") || null;
  const roles = normalizeRoles(formData.getAll("roles"));

  const socialMedia = {
    facebook: str("facebook") || null,
    instagram: str("instagram") || null,
    twitter: str("twitter") || null,
    youtube: str("youtube") || null,
    linkedin: str("linkedin") || null,
    pinterest: str("pinterest") || null,
  };

  const undergraduateDegree = str("undergraduateDegree") || null;
  const undergraduateInstitution = str("undergraduateInstitution") || null;
  const postgraduateDegree = str("postgraduateDegree") || null;
  const postgraduateInstitution = str("postgraduateInstitution") || null;
  const doctorateDegree = str("doctorateDegree") || null;
  const doctorateInstitution = str("doctorateInstitution") || null;
  const quickBiography = str("quickBiography") || null;
  const generalSkillsInfo = str("generalSkillsInfo") || null;

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
          company,
          department,
          jobTitle,
          phone,
          authorUrl,
          authorBio,
          imageUrl,
          active,
          includeInStaffPages,
          staffPageOrHomePage,
          socialMedia,
          undergraduateDegree,
          undergraduateInstitution,
          postgraduateDegree,
          postgraduateInstitution,
          doctorateDegree,
          doctorateInstitution,
          quickBiography,
          generalSkillsInfo,
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
    revalidatePath(`/admin/users/${id}/edit`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update user." };
  }
}

export async function updateUserForm(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  return updateUser(id, formData);
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

export async function deleteUserForm(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await deleteUser(id);
}

/**
 * Canopy V2 — first-run bootstrap for the default Super Admin.
 *
 * Ensures an owner Super Admin account exists so the system can always be
 * reached after a fresh install without manually seeding. Creates it only when
 * no SUPER_ADMIN user exists. Idempotent and safe to call on every login.
 */
import { Role } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { hashPassword } from "@/lib/passwords";
import { TENANT_ID } from "@/lib/tenant";
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "juanito.abelo@gmail.com";

function initialSuperAdminPassword(): string {
  // Prefer an explicit env value; otherwise a documented temporary password
  // that the owner should change on first login.
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!password && process.env.NODE_ENV !== "development") throw new Error("SUPER_ADMIN_PASSWORD is required outside local development.");
  return password ?? "SuperAdmin123!";
}

/**
 * Create the default SUPER_ADMIN user if none exists. Returns true if it was
 * created. The password comes from env (SUPER_ADMIN_PASSWORD) or a documented
 * temporary default.
 */
export async function ensureSuperAdmin(): Promise<{ created: boolean; password: string }> {
  const whereSuperAdmin = {
    role: Role.SUPER_ADMIN,
  };

  const existing = await prisma.userRole.findFirst({
    where: { ...whereSuperAdmin, user: { tenantId: TENANT_ID } },
    include: { user: true },
  });
  if (existing) {
    return { created: false, password: "" };
  }

  const password = initialSuperAdminPassword();
  const id = `super-${TENANT_ID}`;
  const passwordHash = hashPassword(password);

  try {
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        tenantId: TENANT_ID,
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        active: true,
        roles: { create: [{ role: Role.SUPER_ADMIN }] },
      },
      update: {
        active: true,
        roles: { create: [{ role: Role.SUPER_ADMIN }] },
      },
    });
  } catch (e) {
    // Race condition: another request created the role between our findFirst and upsert.
    // If the unique constraint on (userId, role) was violated, the SUPER_ADMIN role
    // already exists — treat as success.
    const alreadyExists = await prisma.userRole.findFirst({
      where: { ...whereSuperAdmin, user: { tenantId: TENANT_ID } },
    });
    if (!alreadyExists) throw e;
  }

  return { created: true, password };
}

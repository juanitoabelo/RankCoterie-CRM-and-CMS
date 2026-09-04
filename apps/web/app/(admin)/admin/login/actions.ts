"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";
import { createSession, destroySession } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/passwords";
import { ensureSuperAdmin } from "@/lib/bootstrap";
import { TENANT_ID } from "@/lib/tenant";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function adminLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const now = Date.now();

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  const attempt = await prisma.loginAttempt.findUnique({ where: { email } });
  if (attempt && attempt.resetAt.getTime() > now && attempt.count >= MAX_ATTEMPTS) {
    throw new Error("Too many login attempts. Try again later.");
  }

  await ensureSuperAdmin();

  const user = await prisma.user.findFirst({
    where: { email, tenantId: TENANT_ID },
    include: { roles: true },
  });
  if (!user || !user.active) {
    await recordFailedAttempt(email, now);
    throw new Error("Invalid email or password.");
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    await recordFailedAttempt(email, now);
    throw new Error("Invalid email or password.");
  }

  await prisma.loginAttempt.deleteMany({ where: { email } });

  await createSession(user.id);
  redirect("/admin");
}

async function recordFailedAttempt(email: string, now: number): Promise<void> {
  const existing = await prisma.loginAttempt.findUnique({ where: { email } });
  if (!existing || existing.resetAt.getTime() <= now) {
    await prisma.loginAttempt.upsert({
      where: { email },
      create: { email, count: 1, resetAt: new Date(now + WINDOW_MS) },
      update: { count: 1, resetAt: new Date(now + WINDOW_MS) },
    });
  } else {
    await prisma.loginAttempt.update({
      where: { email },
      data: { count: existing.count + 1 },
    });
  }
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

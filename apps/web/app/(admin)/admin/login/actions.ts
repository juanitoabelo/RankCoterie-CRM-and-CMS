"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";
import { createSession, destroySession } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/passwords";
import { ensureSuperAdmin } from "@/lib/bootstrap";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function adminLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const now = Date.now();
  const state = attempts.get(email);
  if (state && state.resetAt > now && state.count >= MAX_ATTEMPTS) throw new Error("Too many login attempts. Try again later.");

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  // First-run: make sure the owner Super Admin exists before attempting login.
  await ensureSuperAdmin();

  const user = await prisma.user.findFirst({
    where: { email, tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet" },
    include: { roles: true },
  });
  if (!user || !user.active) {
    recordFailedAttempt(email, now);
    throw new Error("Invalid email or password.");
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    recordFailedAttempt(email, now);
    throw new Error("Invalid email or password.");
  }

  attempts.delete(email);

  await createSession(user.id);
  redirect("/admin");
}

function recordFailedAttempt(email: string, now: number): void {
  const state = attempts.get(email);
  if (!state || state.resetAt <= now) attempts.set(email, { count: 1, resetAt: now + WINDOW_MS });
  else attempts.set(email, { ...state, count: state.count + 1 });
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

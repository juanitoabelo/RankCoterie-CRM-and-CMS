/**
 * Shared login core for the staff, company-owner, and directory-owner portals.
 *
 * Each portal keeps its own route/action/page but shares rate limiting,
 * password verification, and session creation. Portals decide their own
 * redirect target and whether a given user may sign in (separation of
 * company owners from the staff admin).
 */
import { redirect } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { createSession } from "@/modules/auth";
import { verifyPassword } from "@/lib/passwords";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export type PortalUser = {
  id: string;
  email: string;
  active: boolean;
  passwordHash: string;
  roles: { role: string }[];
};

/**
 * Rate-limited credential check. Returns the user on success, or an error
 * message. Never throws — callers decide how to surface/redirect failures.
 */
export async function authenticatePortalUser(
  emailRaw: string,
  password: string,
): Promise<{ ok: true; user: PortalUser } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const now = Date.now();
  const attempt = await prisma.loginAttempt.findUnique({ where: { email } });
  if (attempt && attempt.resetAt.getTime() > now && attempt.count >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many login attempts. Try again later." };
  }

  const user = await prisma.user.findFirst({
    where: { email, tenantId: TENANT_ID },
    include: { roles: true },
  });
  if (!user || !user.active) {
    await recordFailedAttempt(email, now);
    return { ok: false, error: "Invalid email or password." };
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    await recordFailedAttempt(email, now);
    return { ok: false, error: "Invalid email or password." };
  }

  await prisma.loginAttempt.deleteMany({ where: { email } });
  return { ok: true, user };
}

/** Create the session after a successful authenticatePortalUser call. */
export async function startPortalSession(userId: string): Promise<void> {
  await createSession(userId);
}

/** Record a failed login so the rate limiter sees it. */
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

/** Redirect helper so portals keep a single place that decides landing pages. */
export function portalRedirect(path: string): never {
  redirect(path);
}

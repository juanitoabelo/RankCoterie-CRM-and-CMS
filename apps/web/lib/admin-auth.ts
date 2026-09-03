/**
 * Canopy V2 — admin authentication & authorization.
 *
 * Per-user accounts with role-based admin access. A signed httpOnly session
 * cookie (`canopy_session`) carries `{ uid, exp }`; the signature is an
 * HMAC-SHA256 of the payload under `SESSION_SECRET` (see lib/session-token.ts
 * for the edge-safe codec). The cookie holds no secrets and no role data —
 * every server component/action re-reads the user's current roles from the DB
 * (so permission changes apply immediately). The Proxy guard only verifies the
 * signature to let valid sessions through; fine-grained gating happens in each
 * page/action.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  encodeSessionPayload,
  signSessionToken,
  readSessionValue,
} from "@/lib/session-token";

export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  readSessionValue,
} from "@/lib/session-token";

/** Create a session for a user and set it as an httpOnly cookie. */
export async function createSession(uid: string): Promise<void> {
  const payload = encodeSessionPayload({ uid, exp: Date.now() + SESSION_TTL_SECONDS * 1000 });
  const sig = await signSessionToken(payload);
  const value = `${payload}.${sig}`;
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Read the current signed session from cookies; returns uid or null. */
export async function getSessionUid(): Promise<string | null> {
  const store = await cookies();
  return readSessionValue(store.get(SESSION_COOKIE)?.value);
}

/** Destroy the session cookie. */
export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// ---------------------------------------------------------------------------
// Role model & permissions
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: Role[];
}

/** Role-based access to admin sections. SUPER_ADMIN is implicit everywhere. */
const SECTION_ROLES: Record<string, Role[]> = {
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

export function isSuperAdmin(user: Pick<AdminUser, "roles">): boolean {
  return user.roles.includes(Role.SUPER_ADMIN);
}

export function canAccessSection(
  user: Pick<AdminUser, "roles">,
  sectionKey: string,
): boolean {
  if (isSuperAdmin(user)) return true;
  const allowed = SECTION_ROLES[sectionKey];
  if (!allowed) return false;
  return user.roles.some((r) => allowed.includes(r));
}

/** Load the current session user with fresh roles from the DB, or null. */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const uid = await getSessionUid();
  if (!uid) return null;
  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: { roles: true },
  });
  if (!user || !user.active) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles.map((r) => r.role),
  };
}

/** Ensure a valid session exists; otherwise redirect to login. */
export async function requireUser(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user as AdminUser;
}

/** Ensure the user can access a section; otherwise redirect. */
export async function requireSection(sectionKey: string): Promise<AdminUser> {
  const user = await requireUser();
  if (canAccessSection(user, sectionKey)) return user;
  redirect("/admin?forbidden=1");
}

/**
 * Authenticate an API request against the current session. Returns the user or
 * null. Callers respond with 401 when null.
 */
export async function getApiUser(): Promise<AdminUser | null> {
  return getCurrentUser();
}

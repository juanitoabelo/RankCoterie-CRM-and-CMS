/**
 * Auth Module — Public API
 * 
 * Provides authentication and authorization for the admin panel.
 * 
 * @example
 * ```tsx
 * // In a server component
 * import { getCurrentUser, canAccessSection } from "@/modules/auth";
 * 
 * const user = await getCurrentUser();
 * if (user && canAccessSection(user, "listings")) {
 *   // Show listings
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // In a layout
 * import { requireSection } from "@/modules/auth";
 * 
 * const user = await requireSection("users"); // Redirects if not authorized
 * ```
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { getSessionUid } from "./session";
import { isSuperAdmin, canAccessSection } from "./permissions";
import type { AdminUser, CanAccessSection } from "./types";

// Re-export types and pure functions
/** Admin user with roles */
export type { AdminUser, CanAccessSection, SessionPayload } from "./types";
/** Check if user is Super Admin */
export { isSuperAdmin } from "./permissions";
/** Check if user can access a section */
export { canAccessSection } from "./permissions";
/** Create a session cookie */
export { createSession } from "./session";
/** Destroy the session cookie */
export { destroySession } from "./session";
/** Get the current session user ID from the cookie */
export { getSessionUid } from "./session";
/** Session cookie name */
export { SESSION_COOKIE } from "./session";
/** Session TTL in seconds */
export { SESSION_TTL_SECONDS } from "./session";

// Simple in-memory cache for user lookups (avoids repeated DB hits within same request)
const userCache = new Map<string, { user: AdminUser | null; expiresAt: number }>();
const USER_CACHE_TTL_MS = 30_000; // 30 seconds - short TTL to respect permission changes

function getCachedUser(uid: string): AdminUser | null | undefined {
  const cached = userCache.get(uid);
  if (!cached) return undefined;
  if (Date.now() > cached.expiresAt) {
    userCache.delete(uid);
    return undefined;
  }
  return cached.user;
}

function setCachedUser(uid: string, user: AdminUser | null): void {
  userCache.set(uid, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  // Evict stale entries periodically
  if (userCache.size > 100) {
    const now = Date.now();
    for (const [key, val] of userCache) {
      if (now > val.expiresAt) userCache.delete(key);
    }
  }
}

/**
 * Load the current session user with fresh roles from the DB, or null.
 * 
 * Uses in-memory cache with 30-second TTL to avoid repeated DB hits.
 * 
 * @returns The authenticated user or null if not logged in
 * 
 * @example
 * ```tsx
 * const user = await getCurrentUser();
 * if (!user) {
 *   // Not logged in
 * }
 * ```
 */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const uid = await getSessionUid();
  if (!uid) return null;
  
  // Check cache first
  const cached = getCachedUser(uid);
  if (cached !== undefined) return cached;
  
  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: { roles: true },
  });
  if (!user || !user.active) {
    setCachedUser(uid, null);
    return null;
  }
  const result: AdminUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles.map((r) => r.role),
  };
  setCachedUser(uid, result);
  return result;
}

/**
 * Ensure a valid session exists; otherwise redirect to login.
 * 
 * @returns The authenticated user
 * @throws Redirects to /admin/login if not authenticated
 * 
 * @example
 * ```tsx
 * const user = await requireUser();
 * // User is guaranteed to be authenticated
 * ```
 */
export async function requireUser(): Promise<AdminUser> {
  const { redirect } = await import("next/navigation");
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user as AdminUser;
}

/**
 * Ensure the user can access a section; otherwise redirect.
 * 
 * @param sectionKey - The section key to check access for
 * @returns The authenticated user with access to the section
 * @throws Redirects to /admin?forbidden=1 if not authorized
 * 
 * @example
 * ```tsx
 * const user = await requireSection("users");
 * // User is guaranteed to have access to the users section
 * ```
 */
export async function requireSection(sectionKey: string): Promise<AdminUser> {
  const { redirect } = await import("next/navigation");
  const user = await requireUser();
  if (canAccessSection(user, sectionKey)) return user;
  redirect("/admin?forbidden=1");
  return user;
}

/**
 * Authenticate an API request against the current session.
 * 
 * @returns The authenticated user or null
 * 
 * @example
 * ```tsx
 * const user = await getApiUser();
 * if (!user) {
 *   return new Response("Unauthorized", { status: 401 });
 * }
 * ```
 */
export async function getApiUser(): Promise<AdminUser | null> {
  return getCurrentUser();
}

/**
 * Canopy V2 — proxy: legacy /g/ normalization + admin guard.
 *
 * 1. Legacy /g/ URLs (.html/.php, index.php, missing trailing slash) → 301 to the
 *    canonical Next.js form. Region slugs are legacy DomainKeys — mixed case IS
 *    canonical (e.g. "San-Diego-California-CA"), so paths are NOT lowercased here.
 *    Name-based legacy variants need a mapping table from production exports —
 *    verify during Phase 3 traffic cutover.
 * 2. /admin/* requires the admin cookie (shared-secret HMAC, lib/admin-auth).
 */
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-auth";

const G_PREFIX = "/g/";
const LEGACY_INDEX = /^\/g\/(index\.(html?|php))\/?$/i;
const LEGACY_EXT = /\.(html?|php)$/i;
const ADMIN_PREFIX = "/admin";

function legacyGRedirect(pathname: string, req: NextRequest): NextResponse | null {
  if (!pathname.startsWith(G_PREFIX)) return null;

  // Legacy index files → directory root.
  if (LEGACY_INDEX.test(pathname)) {
    return NextResponse.redirect(new URL(G_PREFIX, req.url), 301);
  }

  let target = pathname;

  // Strip .html / .htm / .php suffix.
  if (LEGACY_EXT.test(target)) {
    target = target.replace(LEGACY_EXT, "");
  }

  // Collapse duplicate slashes.
  target = target.replace(/\/{2,}/g, "/");

  // Enforce trailing slash (category AND region URLs are directory-style).
  if (target.length > 1 && !target.endsWith("/")) {
    target += "/";
  }

  if (target !== pathname) {
    const url = req.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    return NextResponse.redirect(url, 301);
  }

  return null;
}

function adminGuard(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith(ADMIN_PREFIX)) return null;

  // Login page itself must stay reachable.
  if (pathname === `${ADMIN_PREFIX}/login` || pathname === `${ADMIN_PREFIX}/login/`) {
    return null;
  }

  const secret = process.env.ADMIN_SECRET ?? "";
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (verifyAdminToken(token, secret)) return null;

  const url = req.nextUrl.clone();
  url.pathname = `${ADMIN_PREFIX}/login`;
  url.search = "";
  return NextResponse.redirect(url, 302);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const gRedirect = legacyGRedirect(pathname, req);
  if (gRedirect) return gRedirect;

  const guard = adminGuard(req);
  if (guard) return guard;

  return NextResponse.next();
}

export const config = {
  matcher: ["/g/:path*", "/admin/:path*"],
};
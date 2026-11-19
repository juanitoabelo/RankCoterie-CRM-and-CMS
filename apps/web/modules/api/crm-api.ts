import { NextResponse, type NextRequest } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { rateLimit } from "@/lib/rate-limit";
import { hasRequiredScope, hashApiKey, parseBearer } from "./auth-helpers";

export type CrmApiAuth =
  | { ok: true; keyId: string; scopes: string[] }
  | { ok: false; response: NextResponse };

export function apiError(status: number, error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

export function apiSuccess<T>(data: T): NextResponse {
  return NextResponse.json({ ok: true, data });
}

export function pagination(request: NextRequest): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? "1") || 1);
  const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "25") || 25));
  return { page, limit, skip: (page - 1) * limit };
}

export async function authenticateCrmApi(
  request: NextRequest,
  requiredScope: string,
): Promise<CrmApiAuth> {
  const token = parseBearer(request.headers.get("authorization"));
  if (!token) {
    return { ok: false, response: apiError(401, "Missing bearer token.") };
  }

  const key = await prisma.crmApiKey.findUnique({
    where: { keyHash: hashApiKey(token) },
  });
  if (!key || key.tenantId !== TENANT_ID || key.revokedAt) {
    return { ok: false, response: apiError(401, "Invalid API key.") };
  }
  if (!hasRequiredScope(key.scopes, requiredScope)) {
    return { ok: false, response: apiError(403, "API key is missing the required scope.") };
  }

  const limited = rateLimit(`crm-api:${key.id}`, 120, 60_000);
  if (!limited.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Too many requests." },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSeconds) },
        },
      ),
    };
  }

  await prisma.crmApiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => null);
  return { ok: true, keyId: key.id, scopes: key.scopes };
}

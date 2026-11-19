import { createHash } from "node:crypto";

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function apiKeyPrefix(token: string): string {
  return token.slice(0, 12);
}

export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export function hasRequiredScope(scopes: string[], required: string): boolean {
  if (scopes.includes("*") || scopes.includes(required)) return true;
  const prefix = required.split(":")[0];
  return prefix ? scopes.includes(`${prefix}:*`) : false;
}

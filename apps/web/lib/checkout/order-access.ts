export interface OrderAccessTokenInput {
  orderId: string;
  tenantId: string;
  email?: string | null;
  sessionId?: string | null;
  checkoutToken?: string | null;
}

export interface OrderAccessPayload {
  v: 1;
  oid: string;
  tid: string;
  email?: string;
  sid?: string;
  ckt?: string;
  exp: number;
}

export const ORDER_ACCESS_TTL_SECONDS = 7 * 24 * 60 * 60;

function secret(): string {
  const configured =
    process.env.ORDER_ACCESS_SECRET?.trim() ||
    process.env.SESSION_SECRET?.trim() ||
    "";
  if (configured) return configured;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL || process.env.RAILWAY_STATIC_URL) {
    throw new Error("ORDER_ACCESS_SECRET or SESSION_SECRET is required in production.");
  }
  return "canopy-dev-order-access-secret-change-me";
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function encodePayload(payload: OrderAccessPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(raw: string): OrderAccessPayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (
      p.v !== 1 ||
      typeof p.oid !== "string" ||
      typeof p.tid !== "string" ||
      typeof p.exp !== "number" ||
      !Number.isFinite(p.exp)
    ) {
      return null;
    }
    return {
      v: 1,
      oid: p.oid,
      tid: p.tid,
      exp: p.exp,
      ...(typeof p.email === "string" ? { email: p.email } : {}),
      ...(typeof p.sid === "string" ? { sid: p.sid } : {}),
      ...(typeof p.ckt === "string" ? { ckt: p.ckt } : {}),
    };
  } catch {
    return null;
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export async function createOrderAccessToken(
  input: OrderAccessTokenInput,
  options?: { now?: number; ttlSeconds?: number },
): Promise<string> {
  const now = options?.now ?? Date.now();
  const payload: OrderAccessPayload = {
    v: 1,
    oid: input.orderId,
    tid: input.tenantId,
    exp: now + (options?.ttlSeconds ?? ORDER_ACCESS_TTL_SECONDS) * 1000,
    ...(clean(input.email) ? { email: clean(input.email)!.toLowerCase() } : {}),
    ...(clean(input.sessionId) ? { sid: clean(input.sessionId)! } : {}),
    ...(clean(input.checkoutToken) ? { ckt: clean(input.checkoutToken)! } : {}),
  };
  const encoded = encodePayload(payload);
  const signature = await crypto.subtle.sign("HMAC", await importKey(), new TextEncoder().encode(encoded));
  return `${encoded}.${Buffer.from(signature).toString("base64url")}`;
}

export async function verifyOrderAccessToken(
  token: string | null | undefined,
  expected: { orderId: string; tenantId: string },
  now: number = Date.now(),
): Promise<OrderAccessPayload | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!signature) return null;
  let valid = false;
  try {
    const expectedSignature = Uint8Array.from(Buffer.from(signature, "base64url"));
    valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(),
      expectedSignature as BufferSource,
      new TextEncoder().encode(encoded),
    );
  } catch {
    return null;
  }
  if (!valid) return null;
  const payload = decodePayload(encoded);
  if (!payload || payload.oid !== expected.orderId || payload.tid !== expected.tenantId) return null;
  if (payload.exp <= now) return null;
  return payload;
}

type OrderForAccess = {
  tenantId: string;
  guestEmail?: string | null;
  billingEmail?: string | null;
  meta?: unknown;
};

export function orderAccessTokenMatchesOrder(
  payload: OrderAccessPayload,
  order: OrderForAccess,
  currentSessionId: string | null,
): boolean {
  if (order.tenantId !== payload.tid) return false;
  const meta = (order.meta ?? {}) as Record<string, unknown>;
  const orderEmails = [order.guestEmail, order.billingEmail]
    .map((value) => clean(value)?.toLowerCase())
    .filter((value): value is string => Boolean(value));
  if (payload.email && orderEmails.includes(payload.email)) return true;
  if (payload.ckt && clean(meta.checkoutToken as string | null | undefined) === payload.ckt) return true;
  if (
    payload.sid &&
    currentSessionId === payload.sid &&
    clean(meta.cartSessionId as string | null | undefined) === payload.sid
  ) {
    return true;
  }
  return false;
}

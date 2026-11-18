import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const PREFIX = "v1:";

function encryptionKey(): Buffer {
  const secret = process.env.CRM_TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "CRM_TOKEN_ENCRYPTION_KEY (or SESSION_SECRET) is required to store CRM OAuth tokens.",
    );
  }
  return createHash("sha256").update(`canopy-crm-oauth:${secret}`).digest();
}

export function tokenEncryptionConfigured(): boolean {
  return Boolean(process.env.CRM_TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET);
}

export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

export function decryptToken(value: string): string {
  if (!value.startsWith(PREFIX)) throw new Error("Unsupported encrypted token format.");
  const raw = Buffer.from(value.slice(PREFIX.length), "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

type OAuthState = {
  provider: string;
  userId: string;
  nonce: string;
  exp: number;
};

function stateKey(): string {
  const secret = process.env.CRM_OAUTH_STATE_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      throw new Error("CRM_OAUTH_STATE_SECRET (or SESSION_SECRET) is required in production.");
    }
    return "canopy-dev-crm-oauth-state";
  }
  return secret;
}

export function signOAuthState(input: Omit<OAuthState, "nonce" | "exp">): string {
  const payload: OAuthState = {
    ...input,
    nonce: randomBytes(16).toString("base64url"),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", stateKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(value: string | undefined | null): OAuthState | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", stateKey()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as OAuthState;
    if (
      typeof parsed?.provider !== "string" ||
      typeof parsed?.userId !== "string" ||
      typeof parsed?.nonce !== "string" ||
      typeof parsed?.exp !== "number" ||
      parsed.exp < Date.now()
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

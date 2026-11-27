import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1:";

function encryptionKey(): Buffer {
  const secret =
    process.env.AI_TOKEN_ENCRYPTION_KEY ||
    process.env.CRM_TOKEN_ENCRYPTION_KEY ||
    process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "AI_TOKEN_ENCRYPTION_KEY (or SESSION_SECRET) is required to store provider keys.",
    );
  }
  return createHash("sha256").update(`canopy-provider-secret:${secret}`).digest();
}

export function secretEncryptionConfigured(): boolean {
  return Boolean(
    process.env.AI_TOKEN_ENCRYPTION_KEY ||
      process.env.CRM_TOKEN_ENCRYPTION_KEY ||
      process.env.SESSION_SECRET,
  );
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString("base64url")}`;
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) throw new Error("Unsupported encrypted secret format.");
  const raw = Buffer.from(value.slice(PREFIX.length), "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

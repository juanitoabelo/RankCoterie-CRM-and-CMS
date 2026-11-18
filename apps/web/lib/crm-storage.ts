import { del, get, put } from "@vercel/blob";

export type CrmStorageProvider = "vercel-blob";

export type StoredCrmFile = {
  provider: CrmStorageProvider;
  key: string;
};

export function isObjectStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function token(): string {
  const value = process.env.BLOB_READ_WRITE_TOKEN;
  if (!value) throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
  return value;
}

function safeName(filename: string): string {
  return (
    filename
      .trim()
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "attachment"
  );
}

/** Store a private CRM attachment in Vercel Blob. */
export async function storeCrmFile(file: File): Promise<StoredCrmFile> {
  const blob = await put(`crm/${safeName(file.name)}`, file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type || "application/octet-stream",
    token: token(),
  });
  return { provider: "vercel-blob", key: blob.url };
}

/** Fetch a private object; the caller streams it to the authenticated user. */
export async function readCrmFile(key: string) {
  return get(key, { access: "private", token: token() });
}

/** Best-effort delete after the database row is removed. */
export async function deleteCrmFile(provider: string | null, key: string | null): Promise<void> {
  if (provider !== "vercel-blob" || !key) return;
  await del(key, { token: token() });
}

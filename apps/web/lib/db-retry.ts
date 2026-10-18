/**
 * Retry a DB operation when the Supabase pooler drops briefly
 * (P1001 "Can't reach database server"). Retries twice with backoff,
 * then rethrows the original error.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  { retries = 2, baseDelayMs = 700 }: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: string })?.code;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = code === "P1001" || msg.includes("Can't reach database server");
      if (!transient || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

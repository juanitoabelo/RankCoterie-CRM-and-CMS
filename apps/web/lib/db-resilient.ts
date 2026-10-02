/**
 * DB resilience helpers for render-critical queries.
 *
 * Layouts and metadata run on every request; a transient database outage
 * must degrade to safe defaults instead of crashing the page (P1001
 * "Can't reach database server" would otherwise 500 the whole site).
 */
export async function safeDb<T>(fn: () => Promise<T>, fallback: T, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries) {
        console.error("[safeDb] query failed after retries — using fallback:", e);
        return fallback;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

import type { Page, Response } from "@playwright/test";

// Dev-mode Next aborts the first navigation per route while it on-demand
// compiles browser chunks. Retry so a one-off abort never fails a smoke test.
export async function goto(
  page: Page,
  url: string,
): Promise<Response | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await page.goto(url, { waitUntil: "domcontentloaded" });
    } catch {
      await page.waitForTimeout(1000 * attempt);
    }
  }
  return page.goto(url, { waitUntil: "domcontentloaded" });
}
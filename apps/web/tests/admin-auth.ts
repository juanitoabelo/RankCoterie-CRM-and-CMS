import type { Page } from "@playwright/test";
import { goto } from "./navigation";

export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "juanito.abelo@gmail.com";
export const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!";

export function uniqueStamp(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueName(prefix: string, stamp: string = uniqueStamp()): string {
  return `${prefix} ${stamp}`;
}

export function uniqueEmail(localPart: string, stamp: string = uniqueStamp()): string {
  return `${localPart}-${stamp}@example.com`;
}

export async function loginAsSuperAdmin(page: Page): Promise<void> {
  await goto(page, "/admin/login");
  if (!page.url().includes("/admin/login")) return;
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => null);

  for (let attempt = 0; attempt < 3; attempt++) {
    await page
      .locator('input[name="email"], input[type="email"]')
      .first()
      .fill(SUPER_ADMIN_EMAIL);
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill(SUPER_ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    try {
      await page.waitForURL((url) => !url.href.includes("/admin/login"), { timeout: 90000 });
      return;
    } catch {
      await page.waitForTimeout(2000);
    }
  }
  throw new Error(`login failed: still on ${page.url()}`);
}

export async function waitForRow<T>(
  query: () => Promise<T | null | undefined>,
  ms = 90000,
): Promise<T> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < ms) {
    try {
      const row = await query();
      if (row !== null && row !== undefined) return row;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`row not found within ${ms}ms${lastError ? `: ${lastError}` : ""}`);
}

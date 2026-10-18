import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "juanito.abelo@gmail.com";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!";

async function loginAsSuperAdmin(page: Page) {
  await goto(page, "/admin/login");
  await page.locator('input[name="email"], input[type="email"]').first().fill(SUPER_ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(SUPER_ADMIN_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

/**
 * The new shared content blocks must be addable from every builder palette and
 * render through the shared renderer registry. The listing template builder is a
 * good end-to-end probe because it exposes the palette, the canvas, and the
 * shared editor fallback in a single screen.
 */
test.describe("Shared content blocks", () => {
  test("renders shared blocks added from the listing template palette", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    await page.getByRole("button", { name: /Pricing Table/i }).click();
    await expect(page.getByText("Simple, transparent pricing")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Custom domain")).toBeVisible();

    await page.getByRole("button", { name: /Announcement Bar/i }).click();
    await expect(page.getByText(/Save 20% on annual plans/)).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: /Stats \/ Counters/i }).click();
    await expect(page.getByText("Happy customers")).toBeVisible({ timeout: 10000 });
  });

  test("offers the shared content blocks in the palette", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    for (const label of [
      /Pricing Table/i,
      /Contact \/ Lead Form/i,
      /Stats \/ Counters/i,
      /Logo Cloud/i,
      /Tabs/i,
      /Directory Search Hero/i,
      /Newsletter Signup/i,
      /Countdown Timer/i,
      /Gallery/i,
      /Steps \/ Timeline/i,
      /Decorative Divider/i,
    ]) {
      await expect(page.getByRole("button", { name: label }).first()).toBeVisible();
    }
  });
});

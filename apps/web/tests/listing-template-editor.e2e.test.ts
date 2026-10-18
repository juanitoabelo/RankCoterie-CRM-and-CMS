import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma } from "@/modules/shared";

const SUPER_ADMIN_EMAIL = "superadmin@example.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";

async function loginAsSuperAdmin(page: Page) {
  await goto(page, "/admin/login");

  await page.locator('input[name="email"], input[type="email"]').first().fill(SUPER_ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(SUPER_ADMIN_PASSWORD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

test.describe("Listing Template Editor", () => {
  test("can access the new template page", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    await expect(page.getByRole("heading", { name: "New Listing Template" })).toBeVisible();
    await expect(page.getByText("Create a template")).toBeVisible();
  });

  test("can add a text block from the palette", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    // Add a text block from the "Basic" section of the palette
    // The palette button has icon "📝" and label "Text"
    await page.getByRole("button", { name: /Text/i }).click();

    // Wait for the block to appear - text blocks show "Text" content
    await expect(page.getByText("Text")).toBeVisible({ timeout: 5000 });
  });

  test("can add a heading block and edit its content", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    // Add a heading block (icon "⬛", label "Heading")
    await page.getByRole("button", { name: /Heading/i }).click();

    // Wait for heading block
    await expect(page.getByRole("heading", { name: /Heading/ })).toBeVisible();

    // Edit the heading text
    const headingInput = page.locator('input[placeholder*="Heading"]').first();
    await expect(headingInput).toBeVisible();
    await headingInput.fill("Test Heading");

    // Verify the heading text was updated
    await expect(page.getByRole("heading", { name: "Test Heading" })).toBeVisible();
  });

  test("can add an image block", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    // Add an image block from the "Listing" section
    await page.getByRole("button", { name: /Image/i }).click();

    // Wait for image block
    await expect(page.getByText("Image")).toBeVisible({ timeout: 5000 });
  });

  test("can add a button block", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    // Add a button block from the "Basic" section
    await page.getByRole("button", { name: /Button/i }).click();

    // Wait for button block
    await expect(page.getByText("Button")).toBeVisible({ timeout: 5000 });
  });

  test("can save the template", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listing-layouts/new");

    // Add a text block
    await page.getByRole("button", { name: /Text/i }).click();
    await expect(page.getByText("Text")).toBeVisible();

    // Click Save
    await page.getByRole("button", { name: /Save/ }).click();

    // Wait for save to complete - the save state shows "Saved"
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10000 });

    // Verify we're still on the editor page
    await expect(page.getByRole("heading", { name: "New Listing Template" })).toBeVisible();
  });
});
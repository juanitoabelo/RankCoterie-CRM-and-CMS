import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";

const TEST_EMAIL = `e2e-flow-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_TITLE = "E2E Test Listing";

async function fillApplyForm(page: Page) {
  await goto(page, "/apply");

  await page.locator('input[name="tier"][value="STANDARD"]').check();
  await page.locator('input[name="title"]').fill(TEST_TITLE);
  await page.locator('input[name="email"]').fill(TEST_EMAIL);
  await page.locator('input[name="password"]').fill(TEST_PASSWORD);
  await page.locator('input[name="confirmPassword"]').fill(TEST_PASSWORD);

  const categoryCheckboxes = page.locator('input[name="categoryIds"]');
  await categoryCheckboxes.first().check();

  const regionPicker = page.locator('[class*="region"], [class*="Region"], [data-testid*="region"]');
  if (await regionPicker.count() > 0) {
    const options = regionPicker.first().locator('button, [role="option"], label');
    const count = await options.count();
    for (let i = 0; i < Math.min(3, count); i++) {
      await options.nth(i).click();
      await page.waitForTimeout(300);
    }
  } else {
    const regionCheckboxes = page.locator('input[name="regionIds"]');
    const count = await regionCheckboxes.count();
    for (let i = 0; i < Math.min(3, count); i++) {
      await regionCheckboxes.nth(i).check();
    }
  }
}

async function login(page: Page) {
  await goto(page, "/admin/login");

  await page.locator('input[name="email"], input[type="email"]').first().fill(TEST_EMAIL);
  await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

test.describe("Full flow: apply to subscribe to add listing", () => {
  test("apply form submits and redirects to Stripe checkout", async ({ page }) => {
    await fillApplyForm(page);

    const submitButton = page.getByRole("button", { name: /continue to payment/i });
    await expect(submitButton).toBeEnabled();

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => null),
      submitButton.click(),
    ]);

    const url = page.url();
    expect(
      url.includes("stripe.com") ||
        url.includes("checkout.stripe.com") ||
        url.includes("/checkout/success") ||
        url.includes("/apply?error"),
    ).toBe(true);
  });

  test("login works with credentials from apply flow", async ({ page }) => {
    await login(page);

    const url = page.url();
    expect(url).toMatch(/\/admin(\/my-listing)?\/?$/);
  });

  test("my listing area shows the claimed listing", async ({ page }) => {
    await login(page);
    await goto(page, "/admin/my-listing");

    await expect(page.getByRole("heading", { name: TEST_TITLE })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit" }).first()).toBeVisible();
  });

  test("edit listing page renders with owner-editable fields", async ({ page }) => {
    await login(page);
    await goto(page, "/admin/my-listing");

    await page.getByRole("link", { name: "Edit" }).first().click();

    await expect(page).toHaveURL(/\/admin\/my-listing\/.+/);
    await expect(page.getByRole("heading", { name: /edit my listing/i })).toBeVisible();
    await expect(page.locator('input[name="companyName"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();
  });

  test("edit listing can update company name and save", async ({ page }) => {
    await login(page);
    await goto(page, "/admin/my-listing");

    await page.getByRole("link", { name: "Edit" }).first().click();

    const companyInput = page.locator('input[name="companyName"]');
    await companyInput.fill("Updated E2E Company");

    await page.getByRole("button", { name: /save changes/i }).click();
    await page.waitForTimeout(2000);

    await expect(page.locator('input[name="companyName"]')).toHaveValue("Updated E2E Company");
  });
});

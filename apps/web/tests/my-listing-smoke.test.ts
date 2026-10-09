import { test, expect } from "@playwright/test";

// Guest-facing smoke test for the My Listing area and its gating.
//
// Covers everything that does not require a Stripe gateway or seeded data:
// the apply form renders with its key fields, and the subscriber-only admin
// surface redirects anonymous visitors to the login page. The Stripe-checkout
// leg of apply (and the claim verification token flow) is exercised by unit
// tests instead of a browser because it needs a configured gateway.
test("home page links to the apply flow", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: /apply to list/i }).first(),
  ).toBeVisible();
});

test("apply page renders the full form", async ({ page }) => {
  await page.goto("/apply");
  await expect(
    page.getByRole("heading", { name: /apply to get listed/i }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("e.g. Clearview Horizon")).toBeVisible();
  await expect(page.getByLabel(/program title/i)).toBeVisible();
  await expect(page.getByLabel(/contact email/i)).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /continue to payment/i })).toBeVisible();
});

test("my listing area redirects guests to login", async ({ page }) => {
  await page.goto("/admin/my-listing");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("admin dashboard redirects guests to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("login page renders", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});
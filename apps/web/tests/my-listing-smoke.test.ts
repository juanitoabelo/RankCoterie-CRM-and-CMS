import { test, expect } from "@playwright/test";
import { goto } from "./navigation";

// Guest-facing smoke test for the My Listing area and its gating.
//
// Covers everything that does not require a Stripe gateway or seeded data:
// the apply form renders with its key fields, and the subscriber-only admin
// surface redirects anonymous visitors to the login page. The Stripe-checkout
// leg of apply (and the claim verification token flow) is exercised by unit
// tests instead of a browser because it needs a configured gateway.
//
// Navs wait for DOMContentLoaded rather than 'load': the storefront is heavily
// server-rendered, and dev-mode client chunk compilation can lag tail assets.

test("home page links to the apply flow", async ({ page }) => {
  await goto(page, "/");
  await expect(
    page.getByRole("link", { name: /apply to list/i }).first(),
  ).toBeVisible();
});

test("apply page renders the full form", async ({ page }) => {
  await goto(page, "/apply");
  await expect(
    page.getByRole("heading", { name: /apply to get listed/i }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("e.g. Clearview Horizon")).toBeVisible();
  await expect(page.locator('input[name="title"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /continue to payment/i })).toBeVisible();
});

test("my listing area redirects guests to login", async ({ page }) => {
  await goto(page, "/admin/my-listing");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("admin dashboard redirects guests to login", async ({ page }) => {
  await goto(page, "/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("login page renders", async ({ page }) => {
  await goto(page, "/admin/login");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[type="password"]').first()).toBeVisible();
});

test("unknown listing slug 404s", async ({ page }) => {
  const resp = await goto(page, "/listing/__smoke_missing__");
  expect(resp?.status()).toBe(404);
});

test("unknown claim slug 404s", async ({ page }) => {
  const resp = await goto(page, "/claim/__smoke_missing__");
  expect(resp?.status()).toBe(404);
});
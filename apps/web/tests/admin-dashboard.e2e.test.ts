import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma } from "@/modules/shared";

const SUPER_ADMIN_EMAIL = "juanito.abelo@gmail.com";
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

async function createPendingListing() {
  return prisma.listing.create({
    data: {
      tenantId: "tenant-masternet",
      title: `Review Test ${Date.now()}`,
      slug: `review-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tier: "STANDARD",
      status: "PENDING_REVIEW",
      email: `review-${Date.now()}@example.com`,
      categories: { create: [{ categoryId: "sample-cat-01" }] },
      regions: { create: [{ regionId: "CA" }, { regionId: "TX" }, { regionId: "FL" }] },
    },
  });
}

test.describe("Admin dashboard", () => {
  test("super admin can access dashboard with stat cards", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText(/listings pending review/i)).toBeVisible();
    await expect(page.getByText(/live listings/i)).toBeVisible();
  });

  test("review queue shows pending listings", async ({ page }) => {
    const listing = await createPendingListing();

    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listings?status=PENDING_REVIEW");

    await expect(page.getByText(listing.title)).toBeVisible();
    await expect(page.getByRole("button", { name: /approve/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /reject/i }).first()).toBeVisible();
  });

  test("staff can approve a pending listing", async ({ page }) => {
    const listing = await createPendingListing();

    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listings?status=PENDING_REVIEW");

    const approveButton = page.getByRole("button", { name: /approve/i }).first();
    await approveButton.click();
    await page.waitForTimeout(2000);

    const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(updated?.status).toBe("LIVE");
  });

  test("staff can reject a pending listing", async ({ page }) => {
    const listing = await createPendingListing();

    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listings?status=PENDING_REVIEW");

    const rejectButton = page.getByRole("button", { name: /reject/i }).first();
    await rejectButton.click();
    await page.waitForTimeout(2000);

    const updated = await prisma.listing.findUnique({ where: { id: listing.id } });
    expect(updated?.status).toBe("DRAFT");
  });
});

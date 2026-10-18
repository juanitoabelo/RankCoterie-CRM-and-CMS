import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma } from "@/modules/shared";
import { hashPassword } from "@/lib/passwords";

const SUB_PASSWORD = "SubPass123!";

function uniqueSubEmail() {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function createSubscriberWithListing() {
  const email = uniqueSubEmail();
  const listing = await prisma.listing.create({
    data: {
      tenantId: "tenant-masternet",
      title: `Sub Test ${Date.now()}`,
      slug: `sub-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tier: "STANDARD",
      status: "LIVE",
      email,
      categories: { create: [{ categoryId: "sample-cat-01" }] },
      regions: { create: [{ regionId: "CA" }, { regionId: "TX" }, { regionId: "FL" }] },
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: "tenant-masternet",
      email,
      passwordHash: hashPassword(SUB_PASSWORD),
      firstName: "Sub",
      lastName: "User",
      active: true,
      roles: { create: [{ role: "SUBSCRIBER" }] },
    },
  });

  await prisma.listing.update({
    where: { id: listing.id },
    data: { claimedById: user.id, claimedAt: new Date() },
  });

  await prisma.listingSubscription.create({
    data: {
      listingId: listing.id,
      tier: "STANDARD",
      status: "LIVE",
      stripeCustomerId: `cus_${Date.now()}`,
      stripeSubId: `sub_${Date.now()}`,
    },
  });

  return { user, listing, email };
}

async function loginAsSubscriber(page: Page, email: string) {
  await goto(page, "/admin/login");

  await page.locator('input[name="email"], input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(SUB_PASSWORD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

test.describe("Subscription management", () => {
  test("upgrade page renders with all tiers", async ({ page }) => {
    const { email } = await createSubscriberWithListing();
    await loginAsSubscriber(page, email);
    await goto(page, "/upgrade");

    await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Standard" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Premium" })).toBeVisible();
  });

  test("upgrade to premium triggers checkout API call", async ({ page }) => {
    const { email } = await createSubscriberWithListing();
    await loginAsSubscriber(page, email);
    await goto(page, "/upgrade");

    const upgradeButton = page.getByRole("button", { name: /upgrade to premium/i });
    await expect(upgradeButton).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/checkout/upgrade"), { timeout: 15000 }),
      upgradeButton.click(),
    ]);

    expect(response).not.toBeNull();
  });

  test("subscriber can access my-listing after upgrade", async ({ page }) => {
    const { email } = await createSubscriberWithListing();
    await loginAsSubscriber(page, email);
    await goto(page, "/admin/my-listing");

    await expect(page.getByRole("heading", { name: /my listing/i })).toBeVisible();
  });
});

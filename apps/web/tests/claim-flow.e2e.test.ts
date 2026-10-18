import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma } from "@/modules/shared";

const CLAIM_PASSWORD = "ClaimPass123!";
const CLAIM_NAME = "Claim Test User";

function uniqueEmail() {
  return `claim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function createClaimableListing() {
  const email = uniqueEmail();
  const listing = await prisma.listing.create({
    data: {
      tenantId: "tenant-masternet",
      title: `Claimable ${Date.now()}`,
      slug: `claimable-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tier: "FREE",
      status: "PENDING_REVIEW",
      email,
      categories: { create: [{ categoryId: "sample-cat-01" }] },
      regions: { create: [{ regionId: "CA" }, { regionId: "TX" }, { regionId: "FL" }] },
    },
  });
  return { ...listing, email };
}

async function submitClaim(page: Page, slug: string, email: string) {
  await goto(page, `/claim/${slug}`);

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="name"]').fill(CLAIM_NAME);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: /send verification email/i }).click(),
  ]);
}

test.describe("Claim flow", () => {
  test("claim form submits and sends verification email", async ({ page }) => {
    const listing = await createClaimableListing();
    await submitClaim(page, listing.slug, listing.email);

    const lead = await prisma.listingLead.findFirst({
      where: { listingId: listing.id },
    });
    expect(lead).not.toBeNull();
    expect(lead?.email).toBe(listing.email);
  });

  test("claim verification redirects to complete page", async ({ page }) => {
    const listing = await createClaimableListing();

    const token = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        verificationToken: token,
        verificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await page.goto(`/api/claim/verify?token=${token}&slug=${listing.slug}`);

    expect(page.url()).toMatch(/\/claim\/.*\/complete/);
  });

  test("complete claim creates account and redirects to my-listing", async ({ page }) => {
    const listing = await createClaimableListing();

    await prisma.listing.update({
      where: { id: listing.id },
      data: { verifiedAt: new Date() },
    });

    await goto(page, `/claim/${listing.slug}/complete`);

    await page.locator('input[name="email"]').fill(listing.email);
    await page.locator('input[name="name"]').fill(CLAIM_NAME);
    await page.locator('input[name="password"]').fill(CLAIM_PASSWORD);
    await page.locator('input[name="confirmPassword"]').fill(CLAIM_PASSWORD);

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
      page.getByRole("button", { name: /create login and claim listing/i }).click(),
    ]);

    const url = page.url();
    expect(url).toMatch(/\/admin\/my-listing\/?$/);

    const user = await prisma.user.findFirst({
      where: { email: listing.email },
    });
    expect(user).not.toBeNull();
  });

  test("claimed listing shows already claimed message", async ({ page }) => {
    const listing = await createClaimableListing();

    const email = uniqueEmail();
    const user = await prisma.user.create({
      data: {
        tenantId: "tenant-masternet",
        email,
        passwordHash: "hashed",
        firstName: CLAIM_NAME,
        active: true,
        roles: { create: [{ role: "SUBSCRIBER" }] },
      },
    });

    await prisma.listing.update({
      where: { id: listing.id },
      data: { claimedById: user.id, claimedAt: new Date() },
    });

    await goto(page, `/claim/${listing.slug}`);

    await expect(page.getByText(/already claimed/i)).toBeVisible();
  });
});

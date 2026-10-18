import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma } from "@/modules/shared";

const SUPER_ADMIN_EMAIL = "juanito.abelo@gmail.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";

async function loginAsSuperAdmin(page: Page) {
  await goto(page, "/admin/login");
  // Already authenticated (e.g. lingering session): login page redirects to /admin.
  if (!page.url().includes("/admin/login")) return;
  // The login page hydrates slowly in dev — filling before hydration lets the
  // client reset the controlled inputs and the POST goes out with empty fields.
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => null);

  for (let attempt = 0; attempt < 3; attempt++) {
    await page
      .locator('input[name="email"], input[type="email"]')
      .first()
      .fill(SUPER_ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(SUPER_ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    try {
      // Successful login redirects off /admin/login to /admin. Dev compiles of
      // changed auth routes can exceed 20s — give the redirect room to land.
      await page.waitForURL((u) => !u.href.includes("/admin/login"), { timeout: 90000 });
      return;
    } catch {
      await page.waitForTimeout(2000);
    }
  }
  throw new Error(`login failed: still on ${page.url()}`);
}

const stamp = Date.now();
const TITLE = `E2E Company Page ${stamp}`;
const SLUG = `e2e-company-${stamp}`;

test.describe.serial("Company listings (landing pages)", () => {
  test.afterAll(async () => {
    const stale = await prisma.listing.findMany({
      where: { slug: { startsWith: "e2e-company-" } },
      select: { id: true },
    });
    const ids = stale.map((s) => s.id);
    if (ids.length) {
      await prisma.listingCategory.deleteMany({ where: { listingId: { in: ids } } });
      await prisma.listingRegion.deleteMany({ where: { listingId: { in: ids } } });
      await prisma.listingSection.deleteMany({ where: { listingId: { in: ids } } });
      await prisma.listingSubTopic.deleteMany({ where: { listingId: { in: ids } } });
      await prisma.listing.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  test("admin list shows migrated company pages", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/company-listings");

    await expect(page.getByRole("heading", { name: "Company Listings" })).toBeVisible({
      timeout: 60000,
    });
    await expect(page.getByRole("link", { name: /Add New Company Page/ }).first()).toBeVisible();
    await expect(page.getByText("Cedar Ridge Adventure School").first()).toBeVisible();
  });

  test("create a company page with section, subtopic and topic", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/company-listings/new");

    await expect(page.getByText("Listing Page URL")).toBeVisible();
    // Dev-mode hydration can lag far behind the streamed SSR HTML — wait for
    // the client bundle to finish loading before interacting with JS-only UI.
    await page.waitForLoadState("networkidle", { timeout: 60000 }).catch(() => null);

    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="slug"]').fill(SLUG);
    await page.locator('input[name="summary"]').fill("E2E summary line");
    await page.locator('input[name="spiderIgnore"]').check();

    const sectionSelect = page
      .locator("select")
      .filter({ has: page.locator("option", { hasText: "--Select Section--" }) });
    const subTopicSelect = page
      .locator("select")
      .filter({ has: page.locator("option", { hasText: "--Select SubTopic--" }) });
    const topicSelect = page
      .locator("select")
      .filter({ has: page.locator("option", { hasText: "--Select Topic--" }) });

    const removeChips = (kind: "section" | "subtopic" | "topic") =>
      page.locator(`[aria-label^="Remove ${kind} "]`);

    // Add-to-list buttons only work once React has hydrated — retry until the
    // chip appears so a premature click can never silently no-op.
    async function addWithRetry(
      select: ReturnType<typeof page.locator>,
      buttonName: string,
      kind: "section" | "subtopic" | "topic",
    ): Promise<void> {
      const chips = removeChips(kind);
      for (let attempt = 0; attempt < 20; attempt++) {
        if ((await chips.count()) >= 1) return;
        await select.selectOption({ index: 1 });
        await page.getByRole("button", { name: buttonName }).click();
        await page.waitForTimeout(1000);
      }
      throw new Error(`${buttonName}: chip never appeared`);
    }

    await addWithRetry(sectionSelect, "Add to Section", "section");
    await addWithRetry(subTopicSelect, "Add to SubTopic", "subtopic");
    await addWithRetry(topicSelect, "Add to Topic", "topic");

    await expect(removeChips("section")).toHaveCount(1);
    await expect(removeChips("subtopic")).toHaveCount(1);
    await expect(removeChips("topic")).toHaveCount(1);

    await page.getByRole("button", { name: "Create Company Page" }).click();
    await page.waitForURL(/\/admin\/company-listings\/[^/]+\/edit/, { timeout: 60000 });

    const saved = await prisma.listing.findUnique({
      where: { slug: SLUG },
      include: {
        sectionLinks: true,
        subTopicLinks: true,
        categories: true,
      },
    });
    expect(saved).not.toBeNull();
    expect(saved?.isLandingPage).toBe(true);
    expect(saved?.status).toBe("LIVE");
    expect(saved?.spiderIgnore).toBe(true);
    expect(saved?.tier).toBe("FREE");
    expect(saved?.sectionLinks.length).toBe(1);
    expect(saved?.subTopicLinks.length).toBe(1);
    expect(saved?.categories.length).toBe(1);
  });

  test("public LandingPage renders company profile with noindex", async ({ page }) => {
    await goto(page, `/LandingPage/${SLUG}/`);

    await expect(page.getByRole("heading", { name: TITLE })).toBeVisible();
    await expect(page.getByText("E2E summary line")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send Message" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      "content",
      /noindex/,
    );
  });

  test("company pages are excluded from the main listings table", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/listings");

    await expect(page.getByText(TITLE)).toHaveCount(0);
  });
});

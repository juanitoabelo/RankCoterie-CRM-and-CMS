import { test, expect, type Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma } from "@/modules/shared";

const SUPER_ADMIN_EMAIL = "juanito.abelo@gmail.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";
const STAMP = Date.now();

let dealId: string | null = null;
const assetIds: string[] = [];

async function loginAsSuperAdmin(page: Page) {
  await goto(page, "/admin/login");
  await page.locator('input[name="email"], input[type="email"]').first().fill(SUPER_ADMIN_EMAIL);
  await page.locator('input[name="password"]').first().fill(SUPER_ADMIN_PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

async function waitForRow<T>(query: () => Promise<T | null>, ms = 90000): Promise<T> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < ms) {
    try {
      const row = await query();
      if (row) return row;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`row not found within ${ms}ms${lastError ? `: ${lastError}` : ""}`);
}

test.afterAll(async () => {
  if (!dealId) return;
  const attachments = await prisma.crmAttachment.findMany({
    where: { dealId },
    select: { assetId: true },
  });
  assetIds.push(
    ...attachments.map((attachment) => attachment.assetId).filter((id): id is string => Boolean(id)),
  );
  await prisma.deal.deleteMany({ where: { id: dealId } });
  if (assetIds.length) {
    await prisma.asset.deleteMany({ where: { id: { in: assetIds } } });
  }
});

test.describe("Admin CRM hardening", () => {
  test("deal, line item, activity, attachment download, and audit trail", async ({ page }) => {
    test.setTimeout(300_000);
    await loginAsSuperAdmin(page);

    await goto(page, "/admin/crm/deals/new");
    const title = `E2E Hardened Deal ${STAMP}`;
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="value"]', "100");
    await page.fill('input[name="companyName"]', "E2E Hardening Co");
    await page.getByRole("button", { name: "Create deal" }).click();

    const deal = await waitForRow(() => prisma.deal.findFirst({ where: { title } }));
    dealId = deal.id;
    await goto(page, `/admin/crm/deals/${deal.id}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.fill('input[name="description"]', "E2E implementation package");
    await page.fill('input[name="quantity"]', "2");
    await page.fill('input[name="unitPrice"]', "150");
    await page.getByRole("button", { name: "Add line item" }).click();
    await waitForRow(() =>
      prisma.dealLineItem.findFirst({ where: { dealId: deal.id, description: "E2E implementation package" } }),
    );
    await goto(page, `/admin/crm/deals/${deal.id}/`);
    await expect(page.getByText("E2E implementation package").first()).toBeVisible({ timeout: 30000 });

    await page.fill('input[name="subject"]', "E2E qualification call");
    await page.fill('textarea[name="body"]', "Verified CRM hardening flow.");
    await page.getByRole("button", { name: "Log activity" }).click();
    await waitForRow(() =>
      prisma.crmActivity.findFirst({ where: { dealId: deal.id, subject: "E2E qualification call" } }),
    );

    const fileBody = `crm e2e attachment ${STAMP}`;
    await page.waitForFunction(
      () => {
        const input = document.querySelector('input[type="file"]');
        return Boolean(input && Object.keys(input).some((key) => key.startsWith("__reactProps$")));
      },
      undefined,
      { timeout: 60000 },
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "e2e-notes.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(fileBody),
    });
    await page.getByRole("button", { name: "Upload attachment" }).click();
    const attachment = await waitForRow(() =>
      prisma.crmAttachment.findFirst({ where: { dealId: deal.id, filename: "e2e-notes.txt" } }),
    );
    const download = await page.request.get(`/api/crm/attachments/${attachment.id}/`);
    expect(download.ok()).toBeTruthy();
    expect(await download.text()).toContain(fileBody);

    await goto(page, "/admin/crm/audit?q=CRM_ATTACHMENT_ADD");
    await expect(page.getByRole("heading", { name: "CRM audit trail" })).toBeVisible();
    await expect(page.getByText("CRM_ATTACHMENT_ADD").first()).toBeVisible();

    await goto(page, "/admin/crm/reports");
    await expect(page.getByRole("heading", { name: /report/i }).first()).toBeVisible();
  });
});

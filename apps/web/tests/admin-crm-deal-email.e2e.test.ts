import { test, expect } from "@playwright/test";
import { goto } from "./navigation";
import { loginAsSuperAdmin, uniqueName, uniqueStamp, waitForRow } from "./admin-auth";
import { prisma, TENANT_ID } from "@/modules/shared";

const STAMP = uniqueStamp();
const DEAL_TITLE = uniqueName("E2E Deal Email", STAMP);

let dealId: string | null = null;

test.describe.serial("Admin CRM deal email", () => {
  test.afterAll(async () => {
    try {
      if (dealId) {
        await prisma.crmEmailMessage.deleteMany({ where: { tenantId: TENANT_ID, dealId } });
        await prisma.deal.deleteMany({ where: { id: dealId, tenantId: TENANT_ID } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test("shows the no-mailbox warning and does not create an email message", async ({ page }) => {
    const connectionCount = await prisma.crmEmailConnection.count({ where: { tenantId: TENANT_ID } });
    test.skip(
      connectionCount > 0,
      "requires a tenant with no CRM email connections; the page warning depends on an empty connection list",
    );

    await loginAsSuperAdmin(page);
    await goto(page, "/admin/crm/deals/new");
    await page.locator('input[name="title"]').fill(DEAL_TITLE);
    await page.locator('input[name="value"]').fill("75");
    await page.locator('input[name="companyName"]').fill("E2E Deal Email Co");
    await page.getByRole("button", { name: "Create deal" }).click();

    const deal = await waitForRow(() =>
      prisma.deal.findFirst({ where: { tenantId: TENANT_ID, title: DEAL_TITLE } }),
    );
    dealId = deal.id;
    await goto(page, `/admin/crm/deals/${deal.id}`);

    await expect(page.getByRole("heading", { name: "Send email" })).toBeVisible({ timeout: 60000 });
    await expect(
      page.getByText("Connect a mailbox in CRM settings before sending email."),
    ).toBeVisible({ timeout: 60000 });
    await expect(page.locator('select[name="connectionId"] option')).toHaveCount(1);
    expect(
      await prisma.crmEmailMessage.count({ where: { tenantId: TENANT_ID, dealId: deal.id } }),
    ).toBe(0);
  });
});

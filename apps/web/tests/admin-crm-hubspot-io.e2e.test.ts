import { test, expect } from "@playwright/test";
import { goto } from "./navigation";
import {
  loginAsSuperAdmin,
  uniqueEmail,
  uniqueName,
  uniqueStamp,
  waitForRow,
} from "./admin-auth";
import { prisma, TENANT_ID } from "@/modules/shared";

const STAMP = uniqueStamp();
const CONTACT_EMAIL = uniqueEmail("e2e-hubspot", STAMP);
const CONTACT_COMPANY = uniqueName("E2E HubSpot Co", STAMP);
const CONTACT_PHONE = `+1555${Date.now().toString().slice(-7)}`;
const ENGAGEMENT_EXTERNAL_ID = `e2e-hubspot-${STAMP}`;
const ENGAGEMENT_EXTERNAL_KEY = `hubspot:${ENGAGEMENT_EXTERNAL_ID}`;
const ENGAGEMENT_SUBJECT = uniqueName("E2E HubSpot note", STAMP);

const CONTACT_CSV = [
  "First Name,Last Name,Email,Company,Phone",
  `HubSpot,E2E Importer,${CONTACT_EMAIL},${CONTACT_COMPANY},${CONTACT_PHONE}`,
  "",
].join("\r\n");

const ENGAGEMENT_CSV = [
  "Type,Subject,Body,Date,Associated Email,External ID",
  `NOTE,${ENGAGEMENT_SUBJECT},Imported by E2E,2026-01-01T00:00:00Z,${CONTACT_EMAIL},${ENGAGEMENT_EXTERNAL_ID}`,
  "",
].join("\r\n");

let leadId: string | null = null;

test.describe.serial("Admin CRM HubSpot import and export", () => {
  test.afterAll(async () => {
    try {
      await prisma.crmActivity.deleteMany({
        where: { tenantId: TENANT_ID, externalId: ENGAGEMENT_EXTERNAL_KEY },
      });
      if (leadId) {
        await prisma.lead.deleteMany({ where: { id: leadId, tenantId: TENANT_ID } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test("imports contacts, dedupes engagements on re-import, and exports CSV", async ({ page }) => {
    test.setTimeout(300_000);
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/crm/import-export");
    await expect(page.getByRole("heading", { name: "Import & export" })).toBeVisible({
      timeout: 60000,
    });
    await page.waitForFunction(
      () => {
        const input = document.querySelector('input[type="file"][name="file"]');
        return Boolean(
          input && Object.keys(input).some((key) => key.startsWith("__reactProps$")),
        );
      },
      undefined,
      { timeout: 60000 },
    );

    await page.locator('select[name="type"]').selectOption("contacts");
    await page.locator('input[type="file"][name="file"]').setInputFiles({
      name: "hubspot-contacts-e2e.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(CONTACT_CSV),
    });
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(
      page.getByText("Imported 1 contacts, 0 deals, and 0 engagements."),
    ).toBeVisible({ timeout: 60000 });
    await expect(page.getByText("Skipped 0 duplicate/invalid rows.")).toBeVisible();

    const lead = await waitForRow(() =>
      prisma.lead.findFirst({ where: { tenantId: TENANT_ID, email: CONTACT_EMAIL } }),
    );
    leadId = lead.id;
    const intake = lead.intake as unknown as Record<string, unknown>;
    const phones = lead.phones as unknown as Record<string, unknown>;
    expect(intake.hubspotCompany).toBe(CONTACT_COMPANY);
    expect(phones.mobile).toBe(CONTACT_PHONE);

    await page.locator('input[type="file"][name="file"]').setInputFiles({
      name: "hubspot-contacts-e2e.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(CONTACT_CSV),
    });
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(
      page.getByText("Imported 1 contacts, 0 deals, and 0 engagements."),
    ).toBeVisible({ timeout: 60000 });
    await expect(page.getByText("Skipped 0 duplicate/invalid rows.")).toBeVisible();
    expect(
      await prisma.lead.count({ where: { tenantId: TENANT_ID, email: CONTACT_EMAIL } }),
    ).toBe(1);

    await goto(page, "/admin/crm/import-export");
    await page.locator('select[name="type"]').selectOption("engagements");
    await page.locator('input[type="file"][name="file"]').setInputFiles({
      name: "hubspot-engagements-e2e.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(ENGAGEMENT_CSV),
    });
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(
      page.getByText("Imported 0 contacts, 0 deals, and 1 engagements."),
    ).toBeVisible({ timeout: 60000 });
    await expect(page.getByText("Skipped 0 duplicate/invalid rows.")).toBeVisible();
    await waitForRow(() =>
      prisma.crmActivity.findFirst({
        where: { tenantId: TENANT_ID, externalId: ENGAGEMENT_EXTERNAL_KEY },
      }),
    );

    await goto(page, "/admin/crm/import-export");
    await page.locator('select[name="type"]').selectOption("engagements");
    await page.locator('input[type="file"][name="file"]').setInputFiles({
      name: "hubspot-engagements-e2e.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(ENGAGEMENT_CSV),
    });
    await page.getByRole("button", { name: "Import CSV" }).click();
    await expect(
      page.getByText("Imported 0 contacts, 0 deals, and 0 engagements."),
    ).toBeVisible({ timeout: 60000 });
    await expect(page.getByText("Skipped 1 duplicate/invalid rows.")).toBeVisible({ timeout: 60000 });
    expect(
      await prisma.crmActivity.count({
        where: { tenantId: TENANT_ID, externalId: ENGAGEMENT_EXTERNAL_KEY },
      }),
    ).toBe(1);

    const response = await page.request.get("/api/admin/crm/hubspot/export?type=contacts");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-disposition"]).toContain(
      'filename="hubspot-contacts.csv"',
    );
    const body = await response.text();
    expect(body).toContain("First Name,Last Name,Email,Company,Phone,Lifecycle Stage");
    expect(body).toContain(CONTACT_EMAIL);
    expect(body).toContain(CONTACT_COMPANY);
    expect(body).toContain(CONTACT_PHONE);
  });
});

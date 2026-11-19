import { test, expect } from "@playwright/test";
import { goto } from "./navigation";
import { loginAsSuperAdmin, uniqueName, uniqueStamp, waitForRow } from "./admin-auth";
import { prisma, TENANT_ID } from "@/modules/shared";

const STAMP = uniqueStamp();
const KEY_NAME = uniqueName("E2E API Key", STAMP);

let apiKeyId: string | null = null;

test.describe.serial("Admin CRM API keys", () => {
  test.afterAll(async () => {
    try {
      if (apiKeyId) {
        await prisma.crmApiKey.deleteMany({ where: { id: apiKeyId, tenantId: TENANT_ID } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test("creates a scoped key, authenticates, revokes, and rejects the token", async ({ page }) => {
    test.setTimeout(300_000);
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/crm/api-keys");
    await expect(page.getByRole("heading", { name: "CRM API keys" })).toBeVisible({
      timeout: 60000,
    });

    await page.locator('input[name="name"]').fill(KEY_NAME);
    await page.locator('input[name="scopes"][value="crm:read"]').check();
    await page.locator('input[name="scopes"][value="crm:write"]').uncheck();
    await page.getByRole("button", { name: "Create key" }).click();
    await expect(
      page.getByText("Copy this token now — it will not be shown again."),
    ).toBeVisible({ timeout: 60000 });

    const token = (
      await page.locator("code").filter({ hasText: /^rc_live_/ }).first().innerText()
    ).trim();
    expect(token.startsWith("rc_live_")).toBeTruthy();

    const key = await waitForRow(() =>
      prisma.crmApiKey.findFirst({ where: { tenantId: TENANT_ID, name: KEY_NAME } }),
    );
    apiKeyId = key.id;
    expect(key.keyPrefix).toBe(token.slice(0, 12));
    expect(key.scopes).toEqual(["crm:read"]);
    expect(key.revokedAt).toBeNull();

    const response = await page.request.get("/api/v1/crm/leads", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { items: unknown[]; total: number };
    expect(Array.isArray(body.items)).toBeTruthy();
    expect(typeof body.total).toBe("number");
    await waitForRow(() =>
      prisma.crmApiKey.findFirst({
        where: { id: key.id, tenantId: TENANT_ID, lastUsedAt: { not: null } },
      }),
    );

    await goto(page, "/admin/crm/api-keys");
    await page
      .locator("form")
      .filter({ has: page.locator(`input[name="id"][value="${key.id}"]`) })
      .getByRole("button", { name: "Revoke" })
      .click();
    await waitForRow(() =>
      prisma.crmApiKey.findFirst({
        where: { id: key.id, tenantId: TENANT_ID, revokedAt: { not: null } },
      }),
    );
    await expect(page.getByText("Revoked").first()).toBeVisible({ timeout: 60000 });

    const revokedResponse = await page.request.get("/api/v1/crm/leads", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(revokedResponse.status()).toBe(401);
  });
});

import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma } from "@/modules/shared";

const SUPER_ADMIN_EMAIL = "juanito.abelo@gmail.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";
const STAMP = Date.now();

const created = {
  leadId: "",
  uiClientId: "",
  merchantId: "",
  invoiceId: "",
  invoiceClientId: "",
  invoiceMerchantId: "",
};

async function loginAsSuperAdmin(page: Page) {
  await goto(page, "/admin/login");

  await page.locator('input[name="email"], input[type="email"]').first().fill(SUPER_ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(SUPER_ADMIN_PASSWORD);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => null),
    page.getByRole("button", { name: /sign in/i }).click(),
  ]);
}

async function openDetails(page: Page, title: string) {
  const details = page.locator("details", { hasText: title }).first();
  const isOpen = await details.evaluate((el) => (el as HTMLDetailsElement).open);
  if (!isOpen) await details.locator("summary").click();
}

/** Server actions on the dev server can take 30-40s; poll the DB for the new row. */
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

/**
 * Give the server-action redirect a chance to land on its own, then load the
 * URL directly. The soft navigation fetches an RSC payload that can take
 * 60-100s on a cold dev server, which would otherwise blow the test budget.
 */
async function gotoRecord(page: Page, path: string, timeoutMs = 30000) {
  await page.waitForURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), {
    timeout: timeoutMs,
  }).catch(() => null);
  if (!page.url().includes(path)) {
    await goto(page, path);
  }
}

test.afterAll(async () => {
  if (created.invoiceId) {
    await prisma.invoice.deleteMany({ where: { id: created.invoiceId } });
  }
  if (created.uiClientId) {
    await prisma.invoice.deleteMany({ where: { clientId: created.uiClientId } });
    await prisma.client.deleteMany({ where: { id: created.uiClientId } });
  }
  if (created.leadId) {
    await prisma.lead.deleteMany({ where: { id: created.leadId } });
  }
  if (created.merchantId) {
    await prisma.merchant.deleteMany({ where: { id: created.merchantId } });
  }
  if (created.invoiceClientId) {
    await prisma.invoice.deleteMany({ where: { clientId: created.invoiceClientId } });
    await prisma.client.deleteMany({ where: { id: created.invoiceClientId } });
  }
  if (created.invoiceMerchantId) {
    await prisma.merchant.deleteMany({ where: { id: created.invoiceMerchantId } });
  }
});

test.describe("Admin CRM forms", () => {
  test("New Lead form saves contact + every intake section", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/leads/new");

    // Source & assignment
    await page.fill('input[name="campaignId"]', `e2e-campaign-${STAMP}`);
    await page.selectOption('select[name="status"]', "OPEN");
    await page.selectOption('select[name="disposition"]', "NEW_INQUIRY");

    // Contact
    await page.fill('input[name="firstName"]', "E2E");
    await page.fill('input[name="lastName"]', `Lead ${STAMP}`);
    await page.fill('input[name="email"]', `e2e-lead-${STAMP}@example.com`);
    await page.fill('input[name="phoneHome"]', "555-0101");
    await page.fill('input[name="phoneWork"]', "555-0102");
    await page.fill('input[name="phoneCell"]', "555-0103");
    await page.fill('input[name="shipAddress1"]', "1 E2E Street");
    await page.fill('input[name="shipCity"]', "Springfield");
    await page.fill('input[name="shipState"]', "UT");
    await page.fill('input[name="shipZip"]', "84001");
    await page.fill('input[name="shipCountry"]', "US");

    // Lead information intake section
    await openDetails(page, "Lead information");
    await page.selectOption('select[name="bestContactMethod"]', "Phone");
    await page.fill('input[name="bestContact"]', "After 6pm");
    await page.fill('input[name="additionalPhone"]', "555-0104");
    await page.fill('input[name="dateOfBirth"]', "1990-04-05");
    await page.fill('input[name="employer"]', "Acme Corp");
    await page.fill('input[name="jobTitle"]', "Engineer");
    await page.selectOption('select[name="isParentGuardian"]', "1");
    await page.fill('input[name="insuranceProvider"]', "Blue Cross");
    await page.selectOption('select[name="insuranceType"]', "PPO");
    await page.fill('input[name="monthlyBudget"]', "4500");
    await page.fill('input[name="howHeard"]', "Google");

    // Patient / child profile intake section
    await openDetails(page, "Patient / child profile");
    await page.fill('input[name="patientFullName"]', "E2E Patient");
    await page.fill('input[name="patientAge"]', "15");
    await page.fill('input[name="patientGender"]', "Female");
    await page.selectOption('select[name="isAdopted"]', "0");
    await page.selectOption('select[name="expectedEnroll"]', "ASAP");
    await page.selectOption('select[name="hasMentalHealthIssues"]', "1");
    await page.fill('textarea[name="mentalIllnessDescription"]', "Anxiety");
    await page.fill('textarea[name="medications"]', "None");
    await page.fill('textarea[name="schoolPerformance"]', "Above average");
    await page.selectOption('select[name="hasCourtAppointment"]', "0");

    // Parent profile intake section
    await openDetails(page, "Parent profile");
    await page.fill('textarea[name="goalAchieve"]', "Stable placement");
    await page.fill('input[name="financialStatus"]', "Stable");
    await page.selectOption('select[name="genderSpecific"]', "1");
    await page.fill('textarea[name="comments"]', "E2E parent comments");

    await page.getByRole("button", { name: "Create lead" }).click();

    const leadRow = await waitForRow(() =>
      prisma.lead.findFirst({ where: { lastName: `Lead ${STAMP}`, campaignId: `e2e-campaign-${STAMP}` } }),
    );
    created.leadId = leadRow.id;
    const leadRedirected = await page
      .waitForURL(/\/admin\/leads\/[^/?]+\/?\?ok=/, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);
    await gotoRecord(page, `/admin/leads/${leadRow.id}`);
    if (leadRedirected) await expect(page.getByText("Lead created.")).toBeVisible();
    await expect(page.getByText(`Campaign: e2e-campaign-${STAMP}`)).toBeVisible();

    // Intake values round-trip onto the detail form
    await expect(page.locator('input[name="employer"]')).toHaveValue("Acme Corp");
    await expect(page.locator('select[name="bestContactMethod"]')).toHaveValue("Phone");
    await expect(page.locator('select[name="insuranceType"]')).toHaveValue("PPO");
    await expect(page.locator('input[name="monthlyBudget"]')).toHaveValue("4500");
    await expect(page.locator('input[name="patientAge"]')).toHaveValue("15");
    await expect(page.locator('select[name="expectedEnroll"]')).toHaveValue("ASAP");
    await expect(page.locator('textarea[name="medications"]')).toHaveValue("None");
    await expect(page.locator('select[name="hasCourtAppointment"]')).toHaveValue("0");
    await expect(page.locator('textarea[name="goalAchieve"]')).toHaveValue("Stable placement");
    await expect(page.locator('select[name="genderSpecific"]')).toHaveValue("1");

    const lead = await prisma.lead.findUnique({ where: { id: created.leadId } });
    expect(lead?.firstName).toBe("E2E");
    expect(lead?.status).toBe("OPEN");
    expect(lead?.disposition).toBe("NEW_INQUIRY");
    expect(lead?.campaignId).toBe(`e2e-campaign-${STAMP}`);
    const intake = lead?.intake as Record<string, unknown> | null;
    expect(intake?.employer).toBe("Acme Corp");
    expect(intake?.insuranceType).toBe("PPO");
    expect(intake?.patientAge).toBe("15");
    expect(intake?.hasMentalHealthIssues).toBe(true);
    expect(intake?.genderSpecific).toBe(true);
    expect(intake?.comments).toBe("E2E parent comments");
  });

  test("New Client form creates a client", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/clients/new");

    await page.fill('input[name="firstName"]', "E2E");
    await page.fill('input[name="lastName"]', `Client ${STAMP}`);
    await page.fill('input[name="email"]', `e2e-client-${STAMP}@example.com`);
    await page.fill('input[name="phoneHome"]', "555-0201");
    await page.fill('input[name="phoneWork"]', "555-0202");
    await page.fill('input[name="phoneCell"]', "555-0203");
    await page.fill('input[name="campaignId"]', `e2e-campaign-${STAMP}`);
    await page.fill('input[name="billAddress1"]', "2 E2E Avenue");
    await page.fill('input[name="billCity"]', "Springfield");
    await page.fill('input[name="billState"]', "UT");
    await page.fill('input[name="billZip"]', "84001");
    await page.fill('input[name="billCountry"]', "US");
    await page.selectOption('select[name="cardType"]', "VISA");
    await page.fill('input[name="cardLast4"]', "4242");

    await page.getByRole("button", { name: "Create client" }).click();

    const clientRow = await waitForRow(() =>
      prisma.client.findFirst({ where: { lastName: `Client ${STAMP}` } }),
    );
    created.uiClientId = clientRow.id;
    const clientRedirected = await page
      .waitForURL(/\/admin\/clients\/[^/?]+\/?\?ok=/, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);
    await gotoRecord(page, `/admin/clients/${clientRow.id}`);
    if (clientRedirected) await expect(page.getByText("Client created.")).toBeVisible();

    await expect(page.locator('input[name="firstName"]')).toHaveValue("E2E");
    await expect(page.locator('input[name="email"]')).toHaveValue(`e2e-client-${STAMP}@example.com`);
    await expect(page.locator('input[name="cardLast4"]')).toHaveValue("4242");

    const client = await prisma.client.findUnique({ where: { id: created.uiClientId } });
    expect(client?.firstName).toBe("E2E");
    expect(client?.lastName).toBe(`Client ${STAMP}`);
    expect(client?.campaignId).toBe(`e2e-campaign-${STAMP}`);
    const clientPhones = (client?.phones ?? []) as { number: string; kind: string }[];
    expect(clientPhones.map((p) => p.kind).sort()).toEqual(["cell", "home", "work"]);
    const clientAddresses = (client?.addresses ?? []) as { kind: string; city?: string | null }[];
    expect(clientAddresses.some((a) => a.kind === "billing" && a.city === "Springfield")).toBe(true);
  });

  test("New Merchant form on the merchants page", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/merchants");

    const addSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Add merchant" }) });
    const addForm = addSection.locator("form").first();
    await addForm.locator('input[name="name"]').fill(`E2E Merchant ${STAMP}`);
    await addForm.locator('input[name="contactName"]').fill("E2E Contact");
    await addForm.locator('input[name="email"]').fill(`e2e-merchant-${STAMP}@example.com`);
    await addForm.locator('input[name="stripeAccountId"]').fill("acct_e2etest");
    await addForm.locator('select[name="status"]').selectOption("ACTIVE");
    await addForm.locator('select[name="payoutMethod"]').selectOption("ACH");
    await addForm.locator('input[name="feePercent"]').fill("2.5");
    await addForm.getByRole("button", { name: "Add", exact: true }).click();

    const merchantRow = await waitForRow(() =>
      prisma.merchant.findFirst({ where: { name: `E2E Merchant ${STAMP}` } }),
    );
    created.merchantId = merchantRow.id;
    const merchantRedirected = await page
      .waitForURL(/\/admin\/merchants\/[^/?]+\/?\?ok=/, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);
    await gotoRecord(page, `/admin/merchants/${merchantRow.id}`);
    await expect(page.getByRole("heading", { name: `E2E Merchant ${STAMP}` })).toBeVisible();
    if (merchantRedirected) {
      await expect(page.getByText(`Merchant "E2E Merchant ${STAMP}" added.`)).toBeVisible();
    }

    const merchant = await prisma.merchant.findUnique({ where: { id: created.merchantId } });
    expect(merchant?.name).toBe(`E2E Merchant ${STAMP}`);
    expect(merchant?.email).toBe(`e2e-merchant-${STAMP}@example.com`);
    expect(merchant?.status).toBe("ACTIVE");
    expect(merchant?.payoutMethod).toBe("ACH");
    expect(merchant?.feePercent.toString()).toBe("2.5");
  });

  test("New Invoice form creates a recurring invoice", async ({ page }) => {
    const setupClient = await prisma.client.create({
      data: {
        tenantId: "tenant-masternet",
        firstName: "E2EInvoiceClient",
        lastName: String(STAMP),
        email: `e2e-inv-client-${STAMP}@example.com`,
      },
    });
    created.invoiceClientId = setupClient.id;
    const setupMerchant = await prisma.merchant.create({
      data: {
        tenantId: "tenant-masternet",
        name: `E2E Invoice Merchant ${STAMP}`,
        status: "ACTIVE",
        payoutMethod: "ACH",
        feePercent: 0,
      },
    });
    created.invoiceMerchantId = setupMerchant.id;
    const amountStr = ((STAMP % 89999) / 100 + 100).toFixed(2);

    await loginAsSuperAdmin(page);
    await goto(page, "/admin/invoices");

    const createSection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "Create invoice" }) });
    const createForm = createSection.locator("form").first();
    await createForm
      .locator('select[name="clientId"]')
      .selectOption({ label: "E2EInvoiceClient " + STAMP });
    await createForm.locator('input[name="amount"]').fill(amountStr);
    await createForm.locator('input[name="chargeNum"]').fill("2");
    await createForm.locator('select[name="merchantId"]').selectOption(setupMerchant.id);
    await createForm.locator('select[name="interval"]').selectOption("MONTHLY");
    await createForm.locator('input[name="isRecurring"]').check();
    await createForm.getByRole("button", { name: "Add", exact: true }).click();

    const invoiceRow = await waitForRow(() =>
      prisma.invoice.findFirst({
        where: { clientId: setupClient.id, responseMsg: { contains: "charge #2" } },
        orderBy: { createdAt: "desc" },
      }),
    );
    created.invoiceId = invoiceRow.id;
    const invoiceRedirected = await page
      .waitForURL(/\/admin\/invoices\/?\?ok=/, { timeout: 60000 })
      .then(() => true)
      .catch(() => false);
    if (!invoiceRedirected) await goto(page, "/admin/invoices/");
    if (invoiceRedirected) {
      await expect(page.getByText(`Invoice created for E2EInvoiceClient ${STAMP}.`)).toBeVisible();
    }

    const invoice = invoiceRow;
    expect(invoice!.amount.toString()).toBe(amountStr);
    expect(invoice!.isRecurring).toBe(true);
    expect(invoice!.interval).toBe("MONTHLY");
    expect(invoice!.merchantId).toBe(setupMerchant.id);
    expect(invoice!.retries).toBe(1);

    // The new row shows up on the list page
    const tbody = page.locator("tbody");
    await expect(tbody.getByText(`$${amountStr}`)).toBeVisible();
    await expect(tbody.getByText(`E2EInvoiceClient ${STAMP}`)).toBeVisible();
  });
});

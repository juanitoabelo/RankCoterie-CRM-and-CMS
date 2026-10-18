import { test, expect, Page } from "@playwright/test";
import { goto } from "./navigation";
import { prisma, TENANT_ID } from "@/modules/shared";

const SUPER_ADMIN_EMAIL = "juanito.abelo@gmail.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin123!";
const STAMP = Date.now();

const CLIENT_NAME = `E2E PayClient ${STAMP}`;
const BILLING_GW_NAME = `E2E Client Billing ${STAMP}`;
const PURPOSE_GW_NAME = `E2E Purpose GW ${STAMP}`;

const created = {
  invoiceId: "",
  clientId: "",
  billingGatewayId: "",
  purposeGatewayId: "",
};

async function loginAsSuperAdmin(page: Page) {
  // Under dev-load the POST /admin/login can take >15s; never race goto()
  // against it — wait until we have actually left the login page.
  for (let attempt = 1; attempt <= 2; attempt++) {
    await goto(page, "/admin/login");
    await page.locator('input[name="email"], input[type="email"]').first().fill(SUPER_ADMIN_EMAIL);
    await page.locator('input[type="password"]').first().fill(SUPER_ADMIN_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page
      .waitForURL((url) => !url.pathname.startsWith("/admin/login"), { timeout: 60000 })
      .catch(() => null);
    if (!new URL(page.url()).pathname.startsWith("/admin/login")) return;
  }
  throw new Error("admin login failed: still on the login page");
}

/** Server actions (incl. Stripe calls) can take a while — poll the DB. */
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

function invoiceRow(page: Page) {
  return page.locator("tbody tr").filter({ hasText: CLIENT_NAME });
}

test.beforeAll(async () => {
  // Start from a clean slate if a previous run died mid-test.
  await prisma.paymentGateway.deleteMany({
    where: { name: { startsWith: "E2E Client Billing" } },
  });
  await prisma.paymentGateway.deleteMany({
    where: { name: { startsWith: "E2E Purpose GW" } },
  });
  await prisma.client.deleteMany({ where: { lastName: { startsWith: "PayClient" } } });

  // Dedicated CLIENT_BILLING gateway — same test keys as the existing Stripe
  // gateway (kept in DB config, never in code).
  const source = await prisma.paymentGateway.findFirst({
    where: { tenantId: TENANT_ID, type: "STRIPE", isEnabled: true },
  });
  const billing = await prisma.paymentGateway.create({
    data: {
      tenantId: TENANT_ID,
      name: BILLING_GW_NAME,
      slug: `e2e-client-billing-${STAMP}`,
      type: "STRIPE",
      purpose: "CLIENT_BILLING",
      isEnabled: true,
      config: source?.config ?? {},
    },
  });
  created.billingGatewayId = billing.id;

  const client = await prisma.client.create({
    data: {
      tenantId: TENANT_ID,
      firstName: "E2E",
      lastName: `PayClient ${STAMP}`,
      email: `e2e-pay-${STAMP}@example.com`,
    },
  });
  created.clientId = client.id;

  const invoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      amount: "42.00",
      chargeDate: new Date(),
      status: "ATTEMPTED",
      isRecurring: false,
      retries: 0,
      responseMsg: "E2E seed invoice",
    },
  });
  created.invoiceId = invoice.id;
});

test.afterAll(async () => {
  if (created.invoiceId) {
    await prisma.invoice.deleteMany({ where: { id: created.invoiceId } });
  }
  if (created.clientId) {
    await prisma.invoice.deleteMany({ where: { clientId: created.clientId } });
    await prisma.client.deleteMany({ where: { id: created.clientId } });
  }
  if (created.purposeGatewayId) {
    await prisma.paymentGateway.deleteMany({ where: { id: created.purposeGatewayId } });
  }
  if (created.billingGatewayId) {
    await prisma.paymentGateway.deleteMany({ where: { id: created.billingGatewayId } });
  }
});

test.describe.serial("Client invoice payments", () => {
  test("gateway purpose can be configured from the Payment Gateway page", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/products/payment-gateway");
    await page.waitForLoadState("networkidle").catch(() => null);

    const createForm = page
      .locator("form")
      .filter({ has: page.getByRole("heading", { name: "Add Payment Gateway" }) })
      .first();
    await expect(createForm.locator("#gw-name")).toBeVisible({ timeout: 60000 });

    // The create form is a client component: until it hydrates, a click falls
    // through to a native GET submit (state lost). Selecting the type only
    // re-renders the credential fields once React is attached, so poll on that.
    await expect
      .poll(
        async () => {
          await createForm.locator("#gw-type").selectOption("MANUAL");
          return createForm.locator("#gw-secretKey").count();
        },
        { timeout: 120000, intervals: [500] },
      )
      .toBe(0);

    await createForm.locator("#gw-name").fill(PURPOSE_GW_NAME);
    await createForm.locator("#gw-type").selectOption("MANUAL");
    await createForm.locator("#gw-purpose").selectOption("LISTING");
    await createForm.getByRole("button", { name: "Create Payment Gateway" }).click();

    // DB is the source of truth for "it actually created".
    const saved = await waitForRow(() =>
      prisma.paymentGateway.findFirst({ where: { tenantId: TENANT_ID, name: PURPOSE_GW_NAME } }),
    );
    created.purposeGatewayId = saved.id;
    expect(saved.purpose).toBe("LISTING");
    expect(saved.type).toBe("MANUAL");

    await expect(createForm.getByText("Gateway created successfully.")).toBeVisible({
      timeout: 60000,
    });
    const row = page.locator("tbody tr").filter({ hasText: PURPOSE_GW_NAME });
    await expect(row).toBeVisible({ timeout: 60000 });
    await expect(row.getByText("LISTING", { exact: true })).toBeVisible();
  });

  test("creates a Stripe payment link for the invoice", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/invoices");

    const row = invoiceRow(page);
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.getByRole("button", { name: "Pay link", exact: true }).click();

    await page.waitForURL(/\/admin\/invoices\/?\?ok=/, { timeout: 120000 });
    await expect(page.getByRole("status")).toContainText("Payment link created:", {
      timeout: 30000,
    });

    const updated = await waitForRow(async () => {
      const inv = await prisma.invoice.findUnique({ where: { id: created.invoiceId } });
      return inv?.payUrl ? inv : null;
    }, 60000);
    expect(updated.payUrl).toMatch(/^https:\/\/buy\.stripe\.com\//);
    expect(updated.gatewayId).toBe(created.billingGatewayId);
    expect(updated.stripePaymentLinkId).toBeTruthy();

    // The row now offers the stored link as an anchor.
    await goto(page, "/admin/invoices");
    const linkRow = invoiceRow(page);
    await expect(linkRow.locator(`a[href="${updated.payUrl}"]`)).toBeVisible({ timeout: 60000 });
  });

  test("public pay page shows the invoice and secure pay button", async ({ page }) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: created.invoiceId } });
    expect(invoice?.payUrl).toBeTruthy();

    await goto(page, `/pay/${created.invoiceId}`);
    await expect(page.getByText("$42.00", { exact: true })).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(CLIENT_NAME)).toBeVisible();
    await expect(page.getByText("ATTEMPTED", { exact: true })).toBeVisible();

    const payButton = page.getByRole("link", { name: /Pay \$42\.00 securely/ });
    await expect(payButton).toHaveAttribute("href", invoice!.payUrl!);
  });

  test("email button reports the mail provider state", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/invoices");

    const row = invoiceRow(page);
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.getByRole("button", { name: "Email", exact: true }).click();

    // No RESEND_API_KEY in this environment — must fail loudly, not silently.
    await page.waitForURL(/\/admin\/invoices\/?\?error=/, { timeout: 120000 });
    // Filter: Next's route announcer is also role=alert (and empty).
    await expect(
      page.getByRole("alert").filter({ hasText: "Email provider not configured" }),
    ).toBeVisible({ timeout: 30000 });
  });

  test("marking the invoice approved flips the pay page to paid state", async ({ page }) => {
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/invoices");

    const row = invoiceRow(page);
    await expect(row).toBeVisible({ timeout: 60000 });
    await row.locator('select[name="status"]').selectOption("APPROVED");
    await row.getByRole("button", { name: "Set", exact: true }).click();

    await page.waitForURL(/\/admin\/invoices\/?\?ok=/, { timeout: 120000 });
    await expect(page.getByRole("status")).toContainText("Invoice marked APPROVED", {
      timeout: 30000,
    });

    const paid = await waitForRow(async () => {
      const inv = await prisma.invoice.findUnique({ where: { id: created.invoiceId } });
      return inv?.status === "APPROVED" && inv.paidAt ? inv : null;
    }, 60000);
    expect(paid.paidAt).not.toBeNull();

    await goto(page, `/pay/${created.invoiceId}`);
    await expect(page.getByText("This invoice has been paid")).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole("link", { name: /Pay \$42\.00 securely/ })).toHaveCount(0);
    await expect(page.getByText("APPROVED", { exact: true })).toBeVisible();
  });
});

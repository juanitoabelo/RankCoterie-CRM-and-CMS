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
const SEQUENCE_NAME = uniqueName("E2E Sequence", STAMP);
const SEQUENCE_DESCRIPTION = uniqueName("E2E sequence description", STAMP);
const FIRST_SUBJECT = uniqueName("Welcome", STAMP);
const FIRST_BODY = uniqueName("Hello {{firstName}}", STAMP);
const STEP_SUBJECT = uniqueName("Follow up", STAMP);
const STEP_BODY = uniqueName("Checking in", STAMP);
const MAILBOX_EMAIL = uniqueEmail("e2e-sequence-mailbox", STAMP);
const RECIPIENT_EMAIL = uniqueEmail("e2e-sequence-recipient", STAMP);

let sequenceId: string | null = null;
let connectionId: string | null = null;

test.describe.serial("Admin CRM email sequences", () => {
  test.afterAll(async () => {
    try {
      if (sequenceId) {
        await prisma.crmEmailMessage.deleteMany({
          where: { tenantId: TENANT_ID, toEmail: RECIPIENT_EMAIL },
        });
        await prisma.crmEmailSequence.deleteMany({
          where: { id: sequenceId, tenantId: TENANT_ID },
        });
      }
      if (connectionId) {
        await prisma.crmEmailConnection.deleteMany({
          where: { id: connectionId, tenantId: TENANT_ID },
        });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test("creates, steps, activates, and enrolls without sending email", async ({ page }) => {
    test.setTimeout(300_000);
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/crm/sequences");
    await expect(page.getByRole("heading", { name: "Email sequences" })).toBeVisible({
      timeout: 60000,
    });

    await page.locator('input[name="name"]').fill(SEQUENCE_NAME);
    await page.locator('input[name="description"]').fill(SEQUENCE_DESCRIPTION);
    await page.locator('input[name="subject"]').fill(FIRST_SUBJECT);
    await page.locator('textarea[name="body"]').fill(FIRST_BODY);
    await Promise.all([
      page.waitForURL(/\/admin\/crm\/sequences\/[^/?#]+/, { timeout: 90000 }),
      page.getByRole("button", { name: "Create sequence" }).click(),
    ]);

    sequenceId = new URL(page.url()).pathname.split("/").filter(Boolean).pop() ?? null;
    expect(sequenceId).toBeTruthy();
    const currentSequenceId = sequenceId as string;
    await expect(page.getByRole("heading", { name: SEQUENCE_NAME })).toBeVisible({
      timeout: 60000,
    });

    const created = await waitForRow(() =>
      prisma.crmEmailSequence.findFirst({
        where: { id: currentSequenceId, tenantId: TENANT_ID },
      }),
    );
    expect(created.name).toBe(SEQUENCE_NAME);
    expect(created.subject).toBe(FIRST_SUBJECT);
    expect(created.status).toBe("DRAFT");

    await page.locator('form:has(input[name="delayMinutes"]) input[name="subject"]').fill(STEP_SUBJECT);
    await page.locator('form:has(input[name="delayMinutes"]) textarea[name="body"]').fill(STEP_BODY);
    await page.locator('input[name="delayMinutes"]').fill("60");
    await page.getByRole("button", { name: "Add step" }).click();

    const step = await waitForRow(() =>
      prisma.crmEmailSequenceStep.findFirst({
        where: { tenantId: TENANT_ID, sequenceId: currentSequenceId, subject: STEP_SUBJECT },
      }),
    );
    expect(step.position).toBe(0);
    expect(step.delayMinutes).toBe(60);

    await page.locator('select[name="status"]').selectOption("ACTIVE");
    await page.getByRole("button", { name: "Update" }).click();
    await waitForRow(() =>
      prisma.crmEmailSequence.findFirst({
        where: { id: currentSequenceId, tenantId: TENANT_ID, status: "ACTIVE" },
      }),
    );

    const connection = await prisma.crmEmailConnection.create({
      data: {
        tenantId: TENANT_ID,
        userId: `e2e-sequence-user-${STAMP}`,
        provider: "google",
        email: MAILBOX_EMAIL,
        accessToken: "e2e-invalid-token-no-send",
        active: true,
      },
    });
    connectionId = connection.id;

    await goto(page, `/admin/crm/sequences/${currentSequenceId}`);
    await expect(
      page.locator(`select[name="connectionId"] option[value="${connection.id}"]`),
    ).toHaveCount(1);
    await page.locator('select[name="connectionId"]').selectOption(connection.id);
    await page.locator('input[name="toEmail"]').fill(RECIPIENT_EMAIL);
    await page.locator('input[name="firstName"]').fill("E2E");
    await page.locator('input[name="lastName"]').fill("Recipient");
    await page.getByRole("button", { name: "Enroll" }).click();

    const enrollment = await waitForRow(() =>
      prisma.crmEmailSequenceEnrollment.findFirst({
        where: { tenantId: TENANT_ID, sequenceId: currentSequenceId, toEmail: RECIPIENT_EMAIL },
      }),
    );
    expect(enrollment.connectionId).toBe(connection.id);
    expect(enrollment.status).toBe("ACTIVE");
    expect(enrollment.currentStep).toBe(0);
    expect(
      await prisma.crmEmailMessage.count({
        where: { tenantId: TENANT_ID, enrollmentId: enrollment.id },
      }),
    ).toBe(0);
  });
});

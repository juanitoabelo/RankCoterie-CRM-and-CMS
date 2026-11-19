import { test, expect } from "@playwright/test";
import { goto } from "./navigation";
import {
  loginAsSuperAdmin,
  uniqueName,
  uniqueStamp,
  waitForRow,
} from "./admin-auth";
import { prisma, TENANT_ID } from "@/modules/shared";

const STAMP = uniqueStamp();
const WORKFLOW_NAME = uniqueName("E2E Workflow", STAMP);
const WORKFLOW_DESCRIPTION = uniqueName("E2E workflow description", STAMP);
const ACTION_TEXT = uniqueName("E2E workflow task", STAMP);
const DEAL_TITLE = uniqueName("E2E Workflow Deal", STAMP);

let workflowId: string | null = null;
let dealId: string | null = null;

test.describe.serial("Admin CRM workflows", () => {
  test.afterAll(async () => {
    try {
      if (dealId) {
        await prisma.toDo.deleteMany({ where: { dealId } });
        await prisma.deal.deleteMany({ where: { id: dealId, tenantId: TENANT_ID } });
      }
      if (workflowId) {
        await prisma.crmWorkflow.deleteMany({ where: { id: workflowId, tenantId: TENANT_ID } });
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  test("creates, toggles, triggers, and deletes a task workflow", async ({ page }) => {
    test.setTimeout(300_000);
    await loginAsSuperAdmin(page);
    await goto(page, "/admin/crm/workflows");
    await expect(page.getByRole("heading", { name: "Workflow automation" })).toBeVisible({
      timeout: 60000,
    });

    await page.locator('input[name="name"]').fill(WORKFLOW_NAME);
    await page.locator('input[name="description"]').fill(WORKFLOW_DESCRIPTION);
    await page.locator('select[name="event"]').selectOption("deal.created");
    await page.locator('select[name="actionType"]').selectOption("create_task");
    await page.locator('input[name="actionText"]').fill(ACTION_TEXT);
    await page.getByRole("button", { name: "Create workflow" }).click();

    const workflow = await waitForRow(() =>
      prisma.crmWorkflow.findFirst({ where: { tenantId: TENANT_ID, name: WORKFLOW_NAME } }),
    );
    workflowId = workflow.id;
    expect(workflow.event).toBe("deal.created");
    expect(workflow.enabled).toBe(true);
    expect(JSON.stringify(workflow.actions)).toContain(ACTION_TEXT);

    await goto(page, "/admin/crm/workflows");
    await page
      .locator("form")
      .filter({ has: page.locator(`input[name="id"][value="${workflow.id}"]`) })
      .filter({ has: page.locator('input[name="enabled"][value="false"]') })
      .getByRole("button", { name: "Pause" })
      .click();
    await waitForRow(() =>
      prisma.crmWorkflow.findFirst({
        where: { id: workflow.id, tenantId: TENANT_ID, enabled: false },
      }),
    );

    await goto(page, "/admin/crm/workflows");
    await page
      .locator("form")
      .filter({ has: page.locator(`input[name="id"][value="${workflow.id}"]`) })
      .filter({ has: page.locator('input[name="enabled"][value="true"]') })
      .getByRole("button", { name: "Enable" })
      .click();
    await waitForRow(() =>
      prisma.crmWorkflow.findFirst({
        where: { id: workflow.id, tenantId: TENANT_ID, enabled: true },
      }),
    );

    await goto(page, "/admin/crm/deals/new");
    await page.locator('input[name="title"]').fill(DEAL_TITLE);
    await page.locator('input[name="value"]').fill("125.50");
    await page.locator('input[name="companyName"]').fill("E2E Workflow Co");
    await page.getByRole("button", { name: "Create deal" }).click();

    const deal = await waitForRow(() =>
      prisma.deal.findFirst({ where: { tenantId: TENANT_ID, title: DEAL_TITLE } }),
    );
    dealId = deal.id;
    await expect(page.getByRole("heading", { name: DEAL_TITLE })).toBeVisible({ timeout: 60000 });

    const run = await waitForRow(() =>
      prisma.crmWorkflowRun.findFirst({
        where: { tenantId: TENANT_ID, workflowId: workflow.id, event: "deal.created" },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(run.matched).toBe(true);
    expect(run.status).toBe("COMPLETED");

    const task = await waitForRow(() =>
      prisma.toDo.findFirst({ where: { dealId: deal.id, text: ACTION_TEXT } }),
    );
    expect(task.status).toBe("OPEN");
    expect(task.priority).toBe("NORMAL");

    await goto(page, "/admin/crm/workflows");
    await page
      .locator("form")
      .filter({ has: page.locator(`input[name="id"][value="${workflow.id}"]`) })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect
      .poll(
        async () => prisma.crmWorkflow.findUnique({ where: { id: workflow.id } }),
        { timeout: 90000, intervals: [1000] },
      )
      .toBeNull();
  });
});

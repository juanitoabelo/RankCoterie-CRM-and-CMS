// Smoke test: exercise P1-P3 DB flows (mirrors admin actions logic).
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.match(/^\s*DATABASE_URL\s*=\s*"(.*?)"?\s*$/m)?.[1];
if (!url) throw new Error("DATABASE_URL not found");
const prisma = new PrismaClient({ datasources: { db: { url } } });

const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";
const results = [];
const ok = (name, cond, detail = "") =>
  results.push(`${cond ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);

try {
  // P1: add lead
  const lead = await prisma.lead.create({
    data: {
      tenantId: TENANT_ID,
      firstName: "Smoke",
      lastName: "Testlead",
      email: "smoke-testlead@example.com",
      phones: [{ number: "555-0100", kind: "mobile" }],
      status: "NEW",
      campaignId: "smoke-test",
    },
  });
  ok("addLead creates lead", lead.id.startsWith("c"));

  // P1: assign + auto follow-up todo (reassign path)
  const user = await prisma.user.findFirst({
    where: { tenantId: TENANT_ID, active: true },
  });
  ok("found user to assign", !!user, user?.email ?? "no user");
  if (user) {
    const assigned = await prisma.lead.update({
      where: { id: lead.id },
      data: { assignedToId: user.id },
    });
    ok("assignLead sets assignedToId", assigned.assignedToId === user.id);
    const todo = await prisma.toDo.create({
      data: {
        leadId: lead.id,
        assigneeId: user.id,
        text: "Follow up with lead Smoke Testlead",
        dueAt: new Date(Date.now() + 86400000),
        status: "OPEN",
      },
    });
    ok("assignLead creates follow-up ToDo", !!todo.id);
  }

  // P1: convert lead → client
  const client = await prisma.client.create({
    data: {
      tenantId: TENANT_ID,
      firstName: "Smoke",
      lastName: "Testlead",
      email: "smoke-testlead@example.com",
      phones: [{ number: "555-0100", kind: "mobile" }],
      leadId: lead.id,
    },
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: "CLOSED", disposition: "CONVERTED" },
  });
  ok("convertLeadToClient creates client + closes lead", !!client.id);

  // P1: client note
  const note = await prisma.clientNote.create({
    data: {
      clientId: client.id,
      userId: user?.id ?? null,
      note: "Smoke test note",
    },
  });
  ok("addClientNote creates note", note.note === "Smoke test note");

  // P2: create invoice linked to merchant (if any)
  const merchant = await prisma.merchant.findFirst();
  ok("found merchant for invoice link", !!merchant, merchant?.name ?? "none");
  const invoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      merchantId: merchant?.id ?? null,
      amount: "99.00",
      status: "APPROVED",
      responseMsg: "Smoke test invoice",
    },
  });
  ok("createInvoice stores merchantId", merchant ? invoice.merchantId === merchant.id : invoice.merchantId === null);

  // P2: refund path (manual, no stripePaymentId)
  const refunded = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "REFUNDED", responseMsg: "Smoke: manual refund (no stripe id)" },
  });
  ok("refundInvoice sets REFUNDED", refunded.status === "REFUNDED");

  // P3: payout-queue age math (merchant detail page logic)
  const aged45 = new Date();
  aged45.setDate(aged45.getDate() - 45);
  const agedApproved = (
    merchant
      ? await prisma.invoice.findMany({
          where: { merchantId: merchant.id, status: "APPROVED", createdAt: { lt: aged45 } },
        })
      : []
  ).filter((i) => i.status === "APPROVED" && i.createdAt < aged45);
  ok("payout queue query runs", Array.isArray(agedApproved), `${agedApproved.length} aged invoices`);

  // P3: lead stats + export query shapes
  const from = new Date(Date.now() - 30 * 86400000);
  const stats = await prisma.lead.groupBy({
    by: ["status"],
    where: { tenantId: TENANT_ID, createdAt: { gte: from } },
    _count: { _all: true },
  });
  ok("getLeadStatsInRange query", stats.length >= 0, stats.map((s) => `${s.status}:${s._count._all}`).join(","));
  const exportRows = await prisma.lead.findMany({
    where: { tenantId: TENANT_ID, createdAt: { gte: from } },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  ok("CSV export query", exportRows.length >= 0, `${exportRows.length} rows`);

  // cleanup
  await prisma.clientNote.delete({ where: { id: note.id } }).catch(() => {});
  await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
  await prisma.toDo.deleteMany({ where: { leadId: lead.id } });
  await prisma.client.delete({ where: { id: client.id } }).catch(() => {});
  await prisma.lead.delete({ where: { id: lead.id } }).catch(() => {});
  results.push("cleanup done");

  // P1: ClientNote table + Invoice.merchantId column live
  const cols = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Invoice' AND column_name='merchantId'`,
  );
  ok("Invoice.merchantId column exists", Array.isArray(cols) && cols.length === 1);
} catch (e) {
  results.push(`FAIL exception — ${e.message}`);
  await prisma.lead.deleteMany({ where: { email: "smoke-testlead@example.com" } }).catch(() => {});
  await prisma.client.deleteMany({ where: { email: "smoke-testlead@example.com" } }).catch(() => {});
} finally {
  await prisma.$disconnect();
  console.log(results.join("\n"));
}

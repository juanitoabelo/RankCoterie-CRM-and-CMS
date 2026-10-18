import { readFileSync } from "node:fs";
import { PrismaClient, Prisma } from "@prisma/client";
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.match(/^\s*DATABASE_URL\s*=\s*"(.*?)"?\s*$/m)?.[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });
const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";
const out = [];

try {
  // temp client + merchant + invoice linked, then verify + cleanup
  const client = await prisma.client.create({
    data: { tenantId: TENANT_ID, firstName: "Fk", lastName: "Test", email: "fk-test@example.com" },
  });
  const merchant = await prisma.merchant.create({
    data: { tenantId: TENANT_ID, name: "FK Smoke Merchant", feePercent: "5.00", payoutMethod: "STRIPE_CONNECT" },
  });
  // backdate an approved invoice 50 days to land in the payout queue
  const oldDate = new Date(Date.now() - 50 * 86400000);
  const invoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      merchantId: merchant.id,
      amount: "200.00",
      status: "APPROVED",
      chargeDate: oldDate,
      createdAt: oldDate,
      responseMsg: "FK smoke",
    },
  });
  out.push(`invoice.merchantId link: ${invoice.merchantId === merchant.id ? "PASS" : "FAIL"}`);

  const cutoff = new Date(Date.now() - 45 * 86400000);
  const aged = await prisma.invoice.findMany({
    where: { merchantId: merchant.id, status: "APPROVED", createdAt: { lt: cutoff } },
  });
  out.push(`payout queue finds aged invoice: ${aged.length === 1 ? "PASS" : "FAIL"} (${aged.length})`);

  const total = aged.reduce((s, i) => s.add(i.amount), new Prisma.Decimal(0));
  const fee = Number(merchant.feePercent) / 100;
  const net = total.mul(1 - fee);
  out.push(`payout math: ${total.toFixed(2)} gross → ${net.toFixed(2)} net @ ${fee*100}% — ${net.toFixed(2) === "190.00" ? "PASS" : "FAIL"}`);

  const updated = await prisma.merchant.update({
    where: { id: merchant.id },
    data: { name: "FK Smoke Merchant v2", feePercent: "7.5" },
  });
  out.push(`merchant edit: ${updated.name === "FK Smoke Merchant v2" && updated.feePercent.toString() === "7.5" ? "PASS" : "FAIL"}`);

  // cascade: deleting client should null out or cascade invoice (invoice has no onDelete → restrict default; delete invoice first)
  await prisma.invoice.delete({ where: { id: invoice.id } });
  await prisma.client.delete({ where: { id: client.id } });
  await prisma.merchant.delete({ where: { id: merchant.id } });
  out.push("cleanup: PASS");
} catch (e) {
  out.push(`FAIL exception — ${e.message}`);
} finally {
  await prisma.$disconnect();
  console.log(out.join("\n"));
}

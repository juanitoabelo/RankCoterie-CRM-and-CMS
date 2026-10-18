import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.match(/^\s*DATABASE_URL\s*=\s*"(.*?)"?\s*$/m)?.[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });
const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";
const out = [];
try {
  // mirror new addLead shape
  const lead = await prisma.lead.create({
    data: {
      tenantId: TENANT_ID,
      firstName: "FormTest",
      lastName: "Parity",
      email: "demo-formtest@example.com",
      phones: [
        { number: "555-9001", kind: "home" },
        { number: "555-9002", kind: "cell" },
      ],
      addresses: [
        { line1: "1 Test Way", city: "Testville", state: "CA", zip: "90210", country: "US", kind: "shipping" },
      ],
      status: "NEW",
      disposition: "NEW_INQUIRY",
      initialDisposition: "NEW_INQUIRY",
      statusDate: new Date(),
      campaignId: "cmp-test",
      intake: { patientName: "Kid Parity", patientAge: "15", isCourtOrdered: true },
    },
  });
  out.push(`addLead shape: PASS (${lead.id})`);

  // mirror new addClient shape (with assignedToId)
  const user = await prisma.user.findFirst({ where: { tenantId: TENANT_ID, active: true } });
  const client = await prisma.client.create({
    data: {
      tenantId: TENANT_ID,
      firstName: "Client",
      lastName: "Parity",
      email: "demo-clientparity@example.com",
      phones: [{ number: "555-9003", kind: "home" }],
      addresses: [
        { line1: "2 Bill St", city: "Billtown", state: "TX", zip: "75001", country: "US", kind: "billing" },
      ],
      maskedCard: "Visa •••• 4242",
      assignedToId: user?.id ?? null,
      campaignId: "cmp-test",
    },
  });
  out.push(`addClient shape w/ assignedToId: PASS (${client.id}, assigned=${client.assignedToId === user?.id})`);

  // cleanup
  await prisma.lead.delete({ where: { id: lead.id } });
  await prisma.client.delete({ where: { id: client.id } });
  out.push("cleanup: PASS");
} catch (e) {
  out.push(`FAIL — ${e.message}`);
} finally {
  await prisma.$disconnect();
  console.log(out.join("\n"));
}

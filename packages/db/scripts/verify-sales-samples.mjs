import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.match(/^\s*DATABASE_URL\s*=\s*"(.*?)"?\s*$/m)?.[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });
const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";
const leads = await prisma.lead.findMany({
  where: { tenantId: TENANT_ID, email: { contains: "demo-" } },
  select: { id: true, firstName: true, lastName: true, status: true, disposition: true, assignedToId: true },
  orderBy: { createdAt: "asc" },
});
const clients = await prisma.client.findMany({
  where: { tenantId: TENANT_ID, email: { contains: "demo-" } },
  select: { id: true, firstName: true, lastName: true, maskedCard: true, leadId: true, isPartial: true },
  orderBy: { createdAt: "asc" },
});
const invoices = await prisma.invoice.count({
  where: { client: { email: { contains: "demo-" } } },
});
const notes = await prisma.leadNote.count({ where: { leadId: leads[2].id } });
const todos = await prisma.toDo.count({ where: { leadId: leads[2].id } });
console.log(JSON.stringify({ leads: leads.length, byStatus: Object.fromEntries(leads.map(l => [`${l.firstName} ${l.lastName}`, `${l.status}/${l.disposition}`])), clients: clients.length, converted: clients.filter(c => c.leadId).length, partial: clients.filter(c => c.isPartial).length, invoices, showcaseNotes: notes, showcaseTodos: todos }, null, 2));
await prisma.$disconnect();

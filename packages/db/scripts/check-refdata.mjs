import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
const url = env.match(/^\s*DATABASE_URL\s*=\s*"(.*?)"?\s*$/m)?.[1];
const prisma = new PrismaClient({ datasources: { db: { url } } });
const TENANT_ID = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";
const [users, merchants, leadCount, clientCount] = await Promise.all([
  prisma.user.findMany({ where: { tenantId: TENANT_ID, active: true }, select: { id: true, firstName: true, lastName: true, email: true }, take: 20 }),
  prisma.merchant.findMany({ select: { id: true, name: true }, take: 5 }),
  prisma.lead.count(),
  prisma.client.count(),
]);
console.log(JSON.stringify({ users, merchants, leadCount, clientCount }, null, 2));
await prisma.$disconnect();

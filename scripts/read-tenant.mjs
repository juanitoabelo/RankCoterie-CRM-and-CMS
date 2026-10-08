import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const tenant = await p.tenant.findFirst();
  console.log("tenantId", tenant?.id);
  console.log("domainKey", tenant?.domainKey);
  console.log("theme keys", Object.keys(tenant?.theme || {}));
} finally {
  await p.$disconnect();
}

import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const tenant = await p.tenant.findFirst();
  const listingPayment = tenant?.theme?.listingPayment ?? null;
  console.log(JSON.stringify(listingPayment, (key, value) => {
    if (/secret|publishable|webhook/i.test(key) && typeof value === "string") {
      return value ? `${value.slice(0, 6)}...` : value;
    }
    return value;
  }, 2));
} finally {
  await p.$disconnect();
}

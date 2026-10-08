import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const listingId = process.argv[2];
try {
  const listing = await p.listing.findUnique({
    where: { id: listingId },
    include: { subscription: true },
  });
  console.log(JSON.stringify({ id: listing?.id, title: listing?.title, tier: listing?.tier, status: listing?.status, subscription: listing?.subscription }, null, 2));
} finally {
  await p.$disconnect();
}

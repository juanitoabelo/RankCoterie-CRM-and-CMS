import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/directory/prismaCatalog";
import { dunningSweep } from "@/lib/billing/dunning";

// Integration test — needs a seeded Postgres (packages/db: db:deploy + db:seed).
// Gated behind CANOPY_INTEGRATION=1 so the default unit suite stays DB-free.
const run = process.env.CANOPY_INTEGRATION === "1" ? describe : describe.skip;

const TENANT = process.env.CANOPY_TENANT_ID ?? "tenant-masternet";

async function seedListing(tier: "STANDARD" | "PREMIUM", status: string, graceUntil: Date | null) {
  const listing = await prisma.listing.create({
    data: {
      tenantId: TENANT,
      tier,
      status: status as never,
      title: `Dunning test ${Math.random().toString(36).slice(2, 8)}`,
      slug: `dunning-test-${Math.random().toString(36).slice(2, 8)}`,
    },
  });
  await prisma.listingSubscription.create({
    data: {
      listingId: listing.id,
      tier,
      status: status as never,
      paymentGraceUntil: graceUntil,
    },
  });
  return listing;
}

run("dunningSweep against seeded canopy_dev", () => {
  it("expires only subscriptions whose grace window has passed", async () => {
    const expired = await seedListing("STANDARD", "SUSPENDED", new Date(Date.now() - 86400000));
    const withinGrace = await seedListing("PREMIUM", "SUSPENDED", new Date(Date.now() + 86400000));
    const live = await seedListing("STANDARD", "LIVE", null);

    const result = await dunningSweep();
    expect(result.expired).toBe(1);

    const [a, b, c] = await Promise.all([
      prisma.listing.findUnique({ where: { id: expired.id } }),
      prisma.listing.findUnique({ where: { id: withinGrace.id } }),
      prisma.listing.findUnique({ where: { id: live.id } }),
    ]);
    expect(a?.status).toBe("EXPIRED");
    expect(b?.status).toBe("SUSPENDED");
    expect(c?.status).toBe("LIVE");

    const sub = await prisma.listingSubscription.findUnique({ where: { listingId: expired.id } });
    expect(sub?.status).toBe("EXPIRED");
    expect(sub?.paymentGraceUntil).toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { entity: "Listing", entityId: expired.id, action: "LISTING_EXPIRE" },
    });
    expect(audit).not.toBeNull();

    await prisma.listingSubscription.deleteMany({
      where: { listingId: { in: [expired.id, withinGrace.id, live.id] } },
    });
    await prisma.listing.deleteMany({
      where: { id: { in: [expired.id, withinGrace.id, live.id] } },
    });
  });

  it("is a no-op when nothing is overdue", async () => {
    const result = await dunningSweep();
    expect(result.expired).toBe(0);
  });
});
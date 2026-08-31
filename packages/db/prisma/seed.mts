/**
 * Canopy V2 — dev seed. Mirrors the Phase-1 mock (`apps/web/lib/directory/catalog.ts`)
 * so page output is byte-for-byte comparable between mock and Prisma backends.
 *
 * Run: `npm run db:seed --workspace=db` (requires Postgres + `prisma migrate dev` first).
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_ID = "tenant-masternet";
const TODAY = new Date("2026-01-15T00:00:00Z");

async function main() {
  await prisma.$transaction(
    async (tx) => {
      // Idempotent reset (FK order matters).
    await tx.feedItem.deleteMany({});
    await tx.feed.deleteMany({});
    await tx.searchArticle.deleteMany({});
    await tx.listingRegion.deleteMany({});
    await tx.listingCategory.deleteMany({});
    await tx.listingSubscription.deleteMany({});
    await tx.merchant.deleteMany({});
    await tx.listing.deleteMany({});
    await tx.invoice.deleteMany({});
    await tx.toDo.deleteMany({});
    await tx.leadNote.deleteMany({});
    await tx.client.deleteMany({});
    await tx.lead.deleteMany({});
    await tx.categoryRegionContent.deleteMany({});
    await tx.categoryRegionFeed.deleteMany({});
    await tx.contentVariant.deleteMany({});
    await tx.contentTemplate.deleteMany({});
    await tx.category.deleteMany({});
    await tx.excludedCompany.deleteMany({});
    await tx.region.deleteMany({});
    await tx.tenant.deleteMany({});

    const tenant = await tx.tenant.create({
      data: {
        id: TENANT_ID,
        name: "MasterNet",
        domainKey: "masternet.org",
        theme: {},
      },
    });

    const regions = {
      ca: await tx.region.create({
        data: {
          id: "CA",
          tenantId: tenant.id,
          state: "CA",
          stateFull: "California",
          city: null,
          areaPart: null,
          slug: "California-CA",
          custom1:
            "<h3>Christian Programs for Troubled Teen Girls {{in region}}</h3><p>Families searching {{in region}} for a Christ-centered program will find proven residential options here.</p>",
          custom2: null,
          priority: 1,
        },
      }),
      caSanDiego: await tx.region.create({
        data: {
          id: "CA-San-Diego",
          tenantId: tenant.id,
          state: "CA",
          stateFull: "California",
          city: "San Diego",
          areaPart: "SOUTHERN",
          slug: "San-Diego-California-CA",
          custom1: "<p>San Diego families {{in region}} have trusted these programs for generations.</p>",
          custom2: null,
          priority: 2,
        },
      }),
      va: await tx.region.create({
        data: {
          id: "VA",
          tenantId: tenant.id,
          state: "VA",
          stateFull: "Virginia",
          city: null,
          areaPart: null,
          slug: "Virginia-VA",
          custom1:
            "<h3>Christian Programs for Troubled Teen Girls {{in region}}</h3><p>Virginia families {{in region}} find care close to home.</p>",
          custom2: null,
          priority: 1,
        },
      }),
      tx_: await tx.region.create({
        data: {
          id: "TX",
          tenantId: tenant.id,
          state: "TX",
          stateFull: "Texas",
          city: null,
          areaPart: null,
          slug: "Texas-TX",
          custom1: null,
          custom2: null,
          priority: 99,
        },
      }),
    };
    const regionList = Object.values(regions);

    const wilderness = await tx.category.create({
      data: {
        id: "cat-wilderness",
        tenantId: tenant.id,
        slug: "wilderness-therapy",
        title: "Wilderness Therapy for Troubled Teen Girls",
        description:
          "Wilderness therapy programs help girls {{in region}} rebuild confidence and trust in a Christ-centered outdoor setting.",
        stateInit:
          "Find wilderness therapy programs for girls {{in region}} — safe, faith-based and staffed by licensed counselors.",
        stateDesc:
          "Our {{region}} wilderness therapy directory lists programs that combine clinical care with the healing power of creation.",
        cityInit:
          "Families {{from region}} searching for wilderness therapy will find vetted Christian programs below.",
        cityDesc: "Compare wilderness therapy options serving the {{region}} area.",
        sections: {},
      },
    });

    const boarding = await tx.category.create({
      data: {
        id: "cat-boarding",
        tenantId: tenant.id,
        slug: "christian-boarding-schools",
        title: "Christian Boarding Schools for Troubled Girls",
        description:
          "Christian boarding schools {{in region}} provide structure, academics and spiritual growth for struggling teen girls.",
        stateInit:
          "Explore accredited Christian boarding schools for girls {{in region}} and nearby states.",
        stateDesc: "A directory of faith-based boarding schools serving {{region}}.",
        cityInit: "Christian boarding schools for girls {{near region}} are listed below.",
        cityDesc: null,
        sections: {},
      },
    });

    const catRegionContent = await tx.categoryRegionContent.create({
      data: {
        id: "crc-wilderness-ca",
        categoryId: wilderness.id,
        state: "CA",
        areaPart: "SOUTHERN",
        customText:
          "<p><em>Southern California families</em>: a curated list of wilderness programs serving {{region}}.</p>",
      },
    });

    const listings: Array<Prisma.ListingCreateInput> = [
      {
        tenantId: TENANT_ID,
        title: "Clearview Horizon",
        slug: "clearview-horizon",
        domainKey: "clearview-horizon",
        tier: "PREMIUM",
        status: "LIVE",
        summary:
          "Christ-centered residential treatment center for troubled teen girls, licensed in California and serving families {{in region}} for 25+ years.",
        phone: "(888) 984-6879",
        website: "https://www.clearviewhorizon.com/",
        city: "San Diego",
        state: "CA",
        companyName: "Clearview Horizon",
        isLandingPage: true,
        createdAt: TODAY,
      },
      {
        tenantId: TENANT_ID,
        title: "A Competitor, Inc.",
        slug: "a-competitor-inc",
        domainKey: "a-competitor-inc",
        tier: "SUPPRESSED", // admin opt-out — must never render
        status: "LIVE",
        summary: "A program the operator has chosen not to display.",
        city: "Sacramento",
        state: "CA",
        companyName: "A Competitor Inc",
        isLandingPage: true,
        createdAt: TODAY,
      },
      {
        tenantId: TENANT_ID,
        title: "Grace Community Homes",
        slug: "grace-community-homes",
        domainKey: "grace-community-homes",
        tier: "FREE",
        status: "LIVE",
        summary: "Legacy free listing still inside its migration grace window.",
        phone: "(435) 899-9997",
        city: "San Diego",
        state: "CA",
        companyName: "Grace Community Homes",
        freeGraceUntil: new Date("2026-04-01T00:00:00Z"), // visible until grace expires
        isLandingPage: true,
        createdAt: TODAY,
      },
    ];

    const createdListings = [];
    for (const data of listings) {
      const listing = await tx.listing.create({ data });
      // Parity with the mock repo (which ignores category/region filters): join every
      // listing to every category and region from the seed.
      await tx.listingCategory.createMany({
        data: [wilderness.id, boarding.id].map((categoryId) => ({ listingId: listing.id, categoryId })),
      });
      await tx.listingRegion.createMany({
        data: regionList.map((r) => ({ listingId: listing.id, regionId: r.id })),
      });
      if (listing.tier === "PREMIUM") {
        await tx.listingSubscription.create({
          data: {
            listingId: listing.id,
            tier: listing.tier,
            status: listing.status,
            currentPeriodEnd: new Date("2027-01-15T00:00:00Z"),
          },
        });
      }
      createdListings.push(listing);
    }

    await tx.excludedCompany.createMany({
      data: [
        {
          tenantId: tenant.id,
          companyName: "A Competitor Inc",
          domainKey: "a-competitor-inc",
          reason: "Operator opt-out (admin suppression).",
          isActive: true,
        },
        {
          tenantId: tenant.id,
          companyName: "Do Not Display",
          domainKey: null,
          reason: "Seed exclusion rule.",
          isActive: true,
        },
      ],
    });

    await tx.contentTemplate.create({
      data: {
        id: "tpl-wilderness",
        tenantId: tenant.id,
        title: "Wilderness Therapy for Troubled Teen Girls",
        body: "<h3>Christian Programs for Troubled Teen Girls {{in region}}</h3><p>Families searching {{in region}} for a Christ-centered program will find proven residential options here.</p>",
        metaDesc: "Find wilderness therapy for girls {{in region}} — safe and faith-based.",
        categoryId: wilderness.id,
        status: "DRAFT",
      },
    });

    // Demo feed (INACTIVE so nothing is fetched until an operator activates
    // it with a real URL). Curation flow: admin/feeds → sync → approve → SearchArticle.
    await tx.feed.create({
      data: {
        id: "feed-demo",
        tenantId: tenant.id,
        name: "Demo feed (replace URL)",
        url: "https://example.com/feed.xml",
        type: "RSS",
        status: "INACTIVE",
      },
    });

    // Demo leads / clients / invoices (Phase 3b admin pages).
    const lead1 = await tx.lead.create({
      data: {
        id: "lead-demo-1",
        tenantId: tenant.id,
        firstName: "Melissa",
        lastName: "Rayner",
        email: "melissa.rayner@example.com",
        phones: [{ number: "(555) 010-1234", kind: "mobile" }],
        addresses: [{ city: "San Diego", state: "CA", zip: "92103" }],
        status: "OPEN",
        disposition: "CALLBACK_SCHEDULED",
        initialDisposition: "NEW_INQUIRY",
        intake: {
          insurance: "Blue Cross",
          diagnosis: "depression, anxiety",
          childAge: 16,
          programs: ["wilderness-therapy"],
          budget: "$5k-10k/mo",
        },
        landingPageId: "wilderness-therapy",
        createdAt: new Date("2026-08-01T15:00:00Z"),
      },
    });
    await tx.leadNote.create({
      data: {
        leadId: lead1.id,
        note: "Spoke with mom — daughter age 16, looking at wilderness programs in California. Sent brochure.",
        userId: "seed-admin",
        createdAt: new Date("2026-08-02T10:00:00Z"),
      },
    });
    await tx.toDo.create({
      data: {
        leadId: lead1.id,
        text: "Follow up with Melissa on Wednesday",
        dueAt: new Date("2026-08-19T10:00:00Z"),
        createdAt: new Date("2026-08-02T10:00:00Z"),
      },
    });
    const lead2 = await tx.lead.create({
      data: {
        id: "lead-demo-2",
        tenantId: tenant.id,
        firstName: "David",
        lastName: "Okonkwo",
        email: "d.okonkwo@example.com",
        phones: [{ number: "(555) 010-9876", kind: "mobile" }],
        addresses: [],
        status: "CLOSED",
        disposition: "ADMISSION_CONFIRMED",
        initialDisposition: "NEW_INQUIRY",
        intake: { childAge: 15, programs: ["christian-boarding-schools"] },
        landingPageId: "christian-boarding-schools",
        createdAt: new Date("2026-07-10T09:00:00Z"),
      },
    });
    const client1 = await tx.client.create({
      data: {
        id: "client-demo-1",
        tenantId: tenant.id,
        firstName: "Melissa",
        lastName: "Rayner",
        email: "melissa.rayner@example.com",
        phones: [{ number: "(555) 010-1234", kind: "mobile" }],
        addresses: [],
        maskedCard: "4242",
        leadId: lead2.id, // David converted to a client
        isPartial: false,
        createdAt: new Date("2026-07-20T12:00:00Z"),
      },
    });
    await tx.invoice.createMany({
      data: [
        {
          clientId: client1.id,
          amount: new Prisma.Decimal("8950.00"),
          chargeDate: new Date("2026-08-01T00:00:00Z"),
          status: "APPROVED",
          isRecurring: true,
          interval: "MONTHLY",
          stripePaymentId: "pi_seed_1",
        },
        {
          clientId: client1.id,
          amount: new Prisma.Decimal("8950.00"),
          chargeDate: new Date("2026-09-01T00:00:00Z"),
          status: "ATTEMPTED",
          isRecurring: true,
          interval: "MONTHLY",
          retries: 1,
          responseMsg: "Card declined, retry scheduled.",
        },
        {
          clientId: client1.id,
          amount: new Prisma.Decimal("2500.00"),
          chargeDate: new Date("2026-07-20T00:00:00Z"),
          status: "REFUNDED",
          isRecurring: false,
          responseMsg: "Partial refund after program change.",
        },
      ],
    });
    // Demo merchant (Stripe Connect pool, legacy §4.6).
    await tx.merchant.create({
      data: {
        id: "merchant-demo-1",
        tenantId: tenant.id,
        name: "Clearview Horizon Ranch",
        contactName: "Sam Alvarez",
        email: "sam@clearview.example.com",
        listingId: createdListings[0]?.id ?? null,
        stripeAccountId: null, // connected later via Stripe Connect onboarding
        status: "ACTIVE",
        payoutMethod: "STRIPE_CONNECT",
        feePercent: new Prisma.Decimal("8.5"),
      },
    });

    void lead1;

    console.log(
      `Seeded: 1 tenant, 4 regions, 2 categories, 1 region-content, ${createdListings.length} listings, 2 exclusions, 1 template, 1 demo feed, 2 leads, 1 client, 3 invoices, 1 merchant.`,
    );
    void catRegionContent;
  },
    { timeout: 120_000 },
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
/**
 * 10 sample listings with region/category assignments — demo data for the
 * /g/* indexation gate, region pages and listing visibility rules.
 *
 * Idempotent: existing slugs are skipped (joins untouched); missing slugs are
 * created with their listingRegion/listingCategory joins.
 *
 * All names are fictional. Websites use example.com (RFC 2606) and phones use
 * the 555-01xx reserved range.
 *
 * Run: cd packages/db && node --env-file=.env prisma/seed-sample-listings.mts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_ID = "tenant-masternet";

type Sample = {
  title: string;
  slug: string;
  tier: "PREMIUM" | "STANDARD" | "FREE";
  status: "LIVE";
  summary: string;
  city: string;
  state: string;
  /** Category slugs the listing belongs to (page rendering filters on these). */
  categories: string[];
  /** Region ids (Region.id, e.g. "CA", "CA-San-Diego") — gate counts these. */
  regions: string[];
  /** FREE listings need a future grace window to stay visible. */
  freeGraceUntil?: Date;
};

const FREE_GRACE = new Date("2027-12-31T00:00:00Z");

const SAMPLES: Sample[] = [
  {
    title: "Cedar Ridge Adventure School",
    slug: "cedar-ridge-adventure-school",
    tier: "PREMIUM",
    status: "LIVE",
    summary:
      "Sample: outdoor-based therapeutic program combining wilderness expeditions with classroom structure for teens {{in region}}.",
    city: "Austin",
    state: "TX",
    categories: ["wilderness-therapy", "residential-treatment"],
    regions: ["TX", "CA", "CA-San-Diego", "VA"],
  },
  {
    title: "Harbor Light Residential",
    slug: "harbor-light-residential",
    tier: "STANDARD",
    status: "LIVE",
    summary:
      "Sample: residential care community for adolescents, with family therapy and academic support for families {{in region}}.",
    city: "Miami",
    state: "FL",
    categories: ["residential-treatment", "teen-depression-anxiety"],
    regions: ["FL", "TX", "NY"],
  },
  {
    title: "New Hope Family Institute",
    slug: "new-hope-family-institute",
    tier: "STANDARD",
    status: "LIVE",
    summary:
      "Sample: family-focused counseling and parent coaching serving teens and young adults {{in region}}.",
    city: "Brooklyn",
    state: "NY",
    categories: ["family-therapy-services", "teen-depression-anxiety"],
    regions: ["NY", "FL", "VA"],
  },
  {
    title: "Sunrise Canyon Wilderness",
    slug: "sunrise-canyon-wilderness",
    tier: "PREMIUM",
    status: "LIVE",
    summary:
      "Sample: wilderness therapy program for struggling teens, serving families {{in region}} from intake through aftercare.",
    city: "Houston",
    state: "TX",
    categories: ["wilderness-therapy"],
    regions: ["TX", "CA", "CA-San-Diego", "FL"],
  },
  {
    title: "Hillcrest Teen Care",
    slug: "hillcrest-teen-care",
    tier: "STANDARD",
    status: "LIVE",
    summary:
      "Sample: small-group residential teen care with accredited schooling and weekly family sessions for families {{in region}}.",
    city: "Richmond",
    state: "VA",
    categories: ["residential-treatment", "christian-boarding-schools"],
    regions: ["VA", "NY", "CA"],
  },
  {
    title: "Anchor Oak Family Services",
    slug: "anchor-oak-family-services",
    tier: "FREE",
    status: "LIVE",
    summary:
      "Sample: adoption and foster support services including home study guidance for families {{in region}}.",
    city: "Sacramento",
    state: "CA",
    categories: ["adoption-foster-care", "family-therapy-services"],
    regions: ["CA", "CA-San-Diego", "FL", "NY"],
    freeGraceUntil: FREE_GRACE,
  },
  {
    title: "Stillwater Anxiety Support",
    slug: "stillwater-anxiety-support",
    tier: "FREE",
    status: "LIVE",
    summary:
      "Sample: anxiety and depression support program for teens, with parent workshops for families {{in region}}.",
    city: "Dallas",
    state: "TX",
    categories: ["teen-depression-anxiety", "family-therapy-services"],
    regions: ["TX", "VA", "NY"],
    freeGraceUntil: FREE_GRACE,
  },
  {
    title: "Redwood Covenant Academy",
    slug: "redwood-covenant-academy",
    tier: "STANDARD",
    status: "LIVE",
    summary:
      "Sample: faith-based boarding school for girls with college-prep academics, serving families {{in region}}.",
    city: "San Diego",
    state: "CA",
    categories: ["christian-boarding-schools", "residential-treatment"],
    regions: ["CA", "CA-San-Diego", "VA"],
  },
  {
    title: "Bayside Hope Center",
    slug: "bayside-hope-center",
    tier: "PREMIUM",
    status: "LIVE",
    summary:
      "Sample: Christian counseling center for teens and families, offering intensive weekend sessions for families {{in region}}.",
    city: "San Diego",
    state: "CA",
    categories: ["family-therapy-services", "teen-depression-anxiety"],
    regions: ["CA-San-Diego", "CA", "FL", "TX"],
  },
  {
    title: "Pine Haven Youth Ministries",
    slug: "pine-haven-youth-ministries",
    tier: "STANDARD",
    status: "LIVE",
    summary:
      "Sample: youth ministry boarding program combining mentorship, trades training and counseling for teens {{in region}}.",
    city: "Orlando",
    state: "FL",
    categories: ["christian-boarding-schools", "adoption-foster-care"],
    regions: ["FL", "NY", "VA"],
  },
];

async function main() {
  const categories = await prisma.category.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, slug: true },
  });
  const categoryIds = new Map(categories.map((c) => [c.slug, c.id]));

  const regions = await prisma.region.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true },
  });
  const regionIds = new Set(regions.map((r) => r.id));

  let created = 0;
  for (const s of SAMPLES) {
    const missingCats = s.categories.filter((slug) => !categoryIds.has(slug));
    if (missingCats.length > 0) {
      throw new Error(`${s.slug}: unknown category slugs: ${missingCats.join(", ")}`);
    }
    const missingRegions = s.regions.filter((id) => !regionIds.has(id));
    if (missingRegions.length > 0) {
      throw new Error(`${s.slug}: unknown region ids: ${missingRegions.join(", ")}`);
    }

    const existing = await prisma.listing.findFirst({
      where: { tenantId: TENANT_ID, slug: s.slug },
      select: { id: true },
    });
    if (existing) {
      console.log(`skip (exists): ${s.slug}`);
      continue;
    }

    const listing = await prisma.listing.create({
      data: {
        tenantId: TENANT_ID,
        title: s.title,
        slug: s.slug,
        domainKey: s.slug,
        companyName: s.title,
        tier: s.tier,
        status: s.status,
        summary: s.summary,
        phone: "(555) 010-0100",
        website: `https://example.com/${s.slug}`,
        city: s.city,
        state: s.state,
        isLandingPage: true,
        ...(s.freeGraceUntil ? { freeGraceUntil: s.freeGraceUntil } : {}),
      },
    });

    await prisma.listingCategory.createMany({
      data: s.categories.map((slug) => ({
        listingId: listing.id,
        categoryId: categoryIds.get(slug)!,
      })),
    });
    await prisma.listingRegion.createMany({
      data: s.regions.map((regionId) => ({ listingId: listing.id, regionId })),
    });

    created += 1;
    console.log(`created: ${s.slug} (regions: ${s.regions.join(", ")})`);
  }

  const totals = await prisma.listingRegion.groupBy({
    by: ["regionId"],
    _count: { regionId: true },
    orderBy: { regionId: "asc" },
  });
  console.log(
    `\nDone. Created ${created}/${SAMPLES.length}. listingRegion counts: ` +
      totals.map((t) => `${t.regionId}=${t._count.regionId}`).join(", "),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/**
 * Phase 2 editorial content for /g/* region pages (see
 * docs/geocategory-and-page-generation.md §4 "Phase 2").
 *
 * Two layers:
 *  1. Region-level `custom1` upgrades — replaces the identical placeholder
 *     template ("…families {{in region}} find care close to home.") for TX, FL,
 *     NY, VA. Guarded: only overwrites rows that still hold that exact
 *     placeholder, so hand-edited copy is never clobbered.
 *  2. Category-specific `CategoryRegionContent` rows — the depth layer that
 *     beats the shared custom1. Keyed by (categoryId, state, areaPart):
 *     states use areaPart "ALL", the San Diego city page uses "SOUTHERN".
 *     Upserted by stable id (crc-<category>-<scope>), reruns update in place.
 *
 * Run: cd packages/db && node --env-file=.env prisma/seed-region-content.mts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TENANT_ID = "tenant-masternet";

const PLACEHOLDER = "<p>{STATE} families {{in region}} find care close to home.</p>";

const CUSTOM1_UPGRADES: Array<{ regionId: string; stateName: string; next: string }> = [
  {
    regionId: "TX",
    stateName: "Texas",
    next: "<h3>Programs for Teens {{in region}}</h3><p>Texas families {{in region}} browse residential treatment centers, Christian boarding schools and wilderness programs — from DFW and Houston to Austin and San Antonio. Compare approaches side by side below, then contact programs directly about fit, accreditation and cost.</p>",
  },
  {
    regionId: "FL",
    stateName: "Florida",
    next: "<h3>Programs for Teens {{in region}}</h3><p>Florida families {{in region}} can choose from residential programs, therapeutic boarding schools and family-therapy services across the state, from the Panhandle to South Florida. Start with the program type that fits your situation, then ask each program about clinical approach, academics and cost.</p>",
  },
  {
    regionId: "NY",
    stateName: "New York",
    next: "<h3>Programs for Teens {{in region}}</h3><p>New York families {{in region}} look for care both in-state and within driving distance of New York City, including residential treatment, wilderness therapy and family counseling options. Use the listings below to compare programs, then confirm licensing and availability directly.</p>",
  },
  {
    regionId: "VA",
    stateName: "Virginia",
    next: "<h3>Programs for Teens {{in region}}</h3><p>Virginia families {{in region}} can explore faith-based boarding schools, residential treatment and teen counseling programs across the Commonwealth — from Northern Virginia to Hampton Roads. Compare each program's approach, then ask about openings, accreditation and cost.</p>",
  },
];

type Scope = { id: string; state: string; areaPart: "ALL" | "SOUTHERN" };

const STATE_SCOPES: Scope[] = [
  { id: "ca", state: "CA", areaPart: "ALL" },
  { id: "tx", state: "TX", areaPart: "ALL" },
  { id: "fl", state: "FL", areaPart: "ALL" },
  { id: "ny", state: "NY", areaPart: "ALL" },
  { id: "va", state: "VA", areaPart: "ALL" },
  { id: "ca-south", state: "CA", areaPart: "SOUTHERN" }, // San Diego city page
];

/** Intro per (category, region scope). Each row is written to be distinct —
 * category angle + regional texture, never a place-name token swap. */
const CONTENT: Record<string, Record<string, string>> = {
  "wilderness-therapy": {
    ca: "<p>Wilderness therapy programs {{in region}} pair backcountry expeditions with clinical check-ins, giving teens space to step away from daily stress while field staff and clinicians work with families on goals set at intake. Programs differ in length, terrain and therapy model — ask each one how progress is measured and what aftercare looks like.</p>",
    tx: "<p>Wilderness therapy programs {{in region}} use Texas ranch land and hill-country trails for hiking, camping and structured group challenges, combined with weekly therapy and school-credit work. When comparing options, ask how the program handles medical needs, family sessions and the transition back home.</p>",
    fl: "<p>Wilderness therapy programs {{in region}} take advantage of Florida's coastal and pine-flat terrain for canoeing, hiking and campcraft while counselors keep clinical work moving. Look for clear plans on academics, insurance and what happens after the outdoor phase ends.</p>",
    ny: "<p>Wilderness therapy programs {{in region}} lean on Adirondack-style trekking and cold-weather camping to build confidence, paired with therapy sessions and parent coaching. Ask each program about season, group size and how families are kept updated while crews are in the field.</p>",
    va: "<p>Wilderness therapy programs {{in region}} run expeditions through the Blue Ridge and Appalachian foothills, mixing trail days with clinical sessions and family workshops. Compare each program's accreditation, staff ratios and plan for the step-down phase.</p>",
    "ca-south": "<p>Wilderness therapy programs {{in region}} in Southern California combine desert and coastal trail time with therapy sessions — a fit for families who want outdoor structure without leaving the state. Ask about heat protocols, licensing and how school work is handled on trail.</p>",
  },
  "residential-treatment": {
    ca: "<p>Residential treatment centers {{in region}} provide 24-hour structure with clinical staffing, schooling and family programming for teens who need more support than outpatient care. Check each center's licensing, staff-to-youth ratio and typical length of stay before deciding.</p>",
    tx: "<p>Residential treatment centers {{in region}} range from large campuses to small therapeutic communities, with on-site schooling common alongside individual and group therapy. Visit if you can, and ask what a typical day looks like for a new admission.</p>",
    fl: "<p>Residential treatment centers {{in region}} serve teens with emotional, behavioral or substance-related needs through structured routines, therapy and academics. Ask how the center involves parents between visits and what its discharge planning includes.</p>",
    ny: "<p>Residential treatment centers {{in region}} vary from clinical campuses to smaller therapeutic homes, with options close to family and further away depending on the setting. Confirm licensing, insurance acceptance and visiting policies early in your search.</p>",
    va: "<p>Residential treatment centers {{in region}} combine counseling, schooling and daily-living skills in a supervised setting, with many programs serving teens across the Mid-Atlantic. Ask about accreditation, aftercare support and how progress is documented.</p>",
    "ca-south": "<p>Residential treatment centers {{in region}} in Southern California offer year-round programs with family involvement, from small group homes to larger clinical campuses. Compare licensing, school accreditation and how quickly intake can be completed.</p>",
  },
};

async function main() {
  // 1. custom1 placeholder upgrades (guarded — never clobbers edited copy).
  for (const u of CUSTOM1_UPGRADES) {
    const placeholder = PLACEHOLDER.replace("{STATE}", u.stateName);
    const res = await prisma.region.updateMany({
      where: { tenantId: TENANT_ID, id: u.regionId, custom1: placeholder },
      data: { custom1: u.next },
    });
    console.log(
      res.count === 1
        ? `custom1 upgraded: ${u.regionId}`
        : `custom1 left as-is (already edited?): ${u.regionId}`,
    );
  }

  // 2. Category-specific CRC rows.
  const categories = await prisma.category.findMany({
    where: { tenantId: TENANT_ID, slug: { in: Object.keys(CONTENT) } },
    select: { id: true, slug: true },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c.id]));

  for (const [catSlug, rows] of Object.entries(CONTENT)) {
    const categoryId = bySlug.get(catSlug);
    if (!categoryId) throw new Error(`category not found: ${catSlug}`);
    for (const scope of STATE_SCOPES) {
      const text = rows[scope.id];
      if (!text) throw new Error(`missing content for ${catSlug} × ${scope.id}`);
      await prisma.categoryRegionContent.upsert({
        where: {
          categoryId_state_areaPart: {
            categoryId,
            state: scope.state,
            areaPart: scope.areaPart,
          },
        },
        create: {
          id: `crc-${catSlug}-${scope.id}`,
          categoryId,
          state: scope.state,
          areaPart: scope.areaPart,
          customText: text,
        },
        update: { customText: text },
      });
    }
    console.log(`CRC rows upserted: ${catSlug} (${STATE_SCOPES.length})`);
  }

  const total = await prisma.categoryRegionContent.count();
  console.log(`\nDone. CategoryRegionContent rows in DB: ${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

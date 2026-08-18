import { describe, expect, it } from "vitest";
import { prisma } from "./prismaCatalog";
import { prismaCatalogRepo } from "./prismaCatalog";
import { previewVariant, publishVariants, regionDisplayName } from "../localization/variants";

// Integration test — needs a seeded Postgres (packages/db: db:deploy + db:seed).
// Gated behind CANOPY_INTEGRATION=1 so the default unit suite stays DB-free.
const run = process.env.CANOPY_INTEGRATION === "1" ? describe : describe.skip;

run("prismaCatalogRepo against seeded canopy_dev", () => {
  it("matches the mock seed exactly", async () => {
    const [cats, regions] = await Promise.all([
      prismaCatalogRepo.getCategories(),
      prismaCatalogRepo.getRegions(),
    ]);

    expect(cats.map((c) => c.slug)).toEqual([
      "christian-boarding-schools",
      "wilderness-therapy",
    ]);
    // Prisma orders by priority asc (CA & VA tie at 1, then SD at 2, TX at 99).
    expect(regions.map((r) => r.slug)).toEqual([
      "California-CA",
      "Virginia-VA",
      "San-Diego-California-CA",
      "Texas-TX",
    ]);

    const cat = await prismaCatalogRepo.getCategoryBySlug("wilderness-therapy");
    expect(cat).not.toBeNull();
    expect(cat!.stateInit).toContain("{{in region}}");

    const sd = await prismaCatalogRepo.getRegionBySlug("San-Diego-California-CA");
    expect(sd?.city).toBe("San Diego");
    expect(sd?.areaPart).toBe("SOUTHERN");

    const indexed = await prismaCatalogRepo.getIndexedStateRegions(cat!.id);
    expect(indexed.map((r) => r.slug)).toEqual(["California-CA", "Virginia-VA"]);

    const children = await prismaCatalogRepo.getChildRegions(cat!.id, "CA");
    expect(children.map((r) => r.slug)).toEqual(["San-Diego-California-CA"]);

    const content = await prismaCatalogRepo.getCategoryRegionContent({
      categoryId: cat!.id,
      state: "CA",
    });
    expect(content[0].areaPart).toBe("SOUTHERN");
    expect(content[0].text).toContain("{{region}}");

    const listings = await prismaCatalogRepo.getListingsByCategoryAndRegion(cat!.id, "ALL");
    expect(listings.map((l) => l.slug).sort()).toEqual([
      "a-competitor-inc",
      "clearview-horizon",
      "grace-community-homes",
    ]);

    const exclusions = await prismaCatalogRepo.getExclusions();
    expect(exclusions.length).toBeGreaterThan(0);
  });

  it("renders previews and publishes content-template variants idempotently", async () => {
    const template = await prisma.contentTemplate.findFirst({ where: { id: "tpl-wilderness" } });
    expect(template).not.toBeNull();

    // Clean slate so the test is repeatable across runs.
    await prisma.contentVariant.deleteMany({ where: { templateId: template!.id } });

    const region = await prisma.region.findUnique({ where: { id: "CA-San-Diego" } });
    expect(region).not.toBeNull();
    expect(regionDisplayName(region!)).toBe("San Diego, CA");

    const preview = previewVariant(template!.body, region!);
    expect(preview).toContain("Christian Programs for Troubled Teen Girls in San Diego, CA");
    expect(preview).not.toContain("{{");

    // First publish: 3 regions → 3 variants, revision 1, template LIVE.
    const targetIds = ["CA", "CA-San-Diego", "VA"];
    const first = await publishVariants(template!.id, targetIds);
    expect(first).toBe(3);

    const variants = await prisma.contentVariant.findMany({
      where: { templateId: template!.id },
    });
    expect(variants).toHaveLength(3);
    expect(variants.every((v) => v.revision === 1)).toBe(true);
    expect(variants.every((v) => v.status === "LIVE")).toBe(true);

    // Republish unchanged → 0 written, no revision bump.
    const again = await publishVariants(template!.id, targetIds);
    expect(again).toBe(0);
    expect((await prisma.contentVariant.findMany({ where: { templateId: template!.id } })).every((v) => v.revision === 1)).toBe(true);

    // Changed template body → republish bumps only affected revisions.
    await prisma.contentTemplate.update({
      where: { id: template!.id },
      data: { body: "<h3>Updated {{region}} intro</h3>" },
    });
    const third = await publishVariants(template!.id, ["CA"]);
    expect(third).toBe(1);
    const caVariant = await prisma.contentVariant.findUnique({
      where: { templateId_regionId: { templateId: template!.id, regionId: "CA" } },
    });
    expect(caVariant?.revision).toBe(2);
    expect(caVariant?.body).toContain("Updated California intro");

    // Restore the seed body so re-seeding isn't required for repeat runs.
    await prisma.contentTemplate.update({
      where: { id: template!.id },
      data: {
        body: "<h3>Christian Programs for Troubled Teen Girls {{in region}}</h3><p>Families searching {{in region}} for a Christ-centered program will find proven residential options here.</p>",
        status: "DRAFT",
      },
    });
  });
});
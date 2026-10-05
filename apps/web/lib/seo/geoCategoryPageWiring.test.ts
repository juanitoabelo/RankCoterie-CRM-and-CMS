import { describe, expect, it } from "vitest";
import { generateMetadata as regionGenerateMetadata } from "@/app/(site)/g/[category]/[region]/page";
import { generateMetadata as pageGenerateMetadata } from "@/app/(site)/g/[category]/[region]/page/[pageNum]/page";

/**
 * Wiring tests: prove the page-level generateMetadata functions actually feed
 * the index gate into robots (the rule is unit-tested in indexGate.test.ts;
 * these catch a page forgetting to pass `indexable` through).
 * Runs against the mock repo (CATALOG_REPO unset): TX has neither listings nor
 * authored content; VA has authored content but no listings.
 */

function regionProps(category: string, region: string) {
  return {
    params: Promise.resolve({ category, region }),
    searchParams: Promise.resolve({}),
  };
}

describe("/g/ region page metadata wiring", () => {
  it("noindexes a region the gate excludes (no listings, no authored content)", async () => {
    const meta = await regionGenerateMetadata(regionProps("wilderness-therapy", "Texas-TX"));
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.title).toBe("Wilderness Therapy for Troubled Teen Girls in Texas");
    expect(meta.alternates?.canonical).toContain("/g/wilderness-therapy/Texas-TX/");
  });

  it("indexes a region that earns it via authored content (even with 0 listings)", async () => {
    const meta = await regionGenerateMetadata(regionProps("wilderness-therapy", "Virginia-VA"));
    expect(meta.robots).toEqual({ index: true, follow: true });
  });
});

describe("/g/ pagination page metadata wiring", () => {
  const pageProps = (region: string, pageNum: string) => ({
    params: Promise.resolve({ category: "wilderness-therapy", region, pageNum }),
  });

  it("keeps page 2 noindex when the region has no listings to spill onto it", async () => {
    // VA is indexable (authored) but has 0 listings → /page/2/ would be an
    // empty duplicate — gate must force noindex.
    const meta = await pageGenerateMetadata(pageProps("Virginia-VA", "2"));
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toContain("/Virginia-VA/page/2/");
  });

  it("noindexes pagination for an excluded region outright", async () => {
    const meta = await pageGenerateMetadata(pageProps("Texas-TX", "2"));
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

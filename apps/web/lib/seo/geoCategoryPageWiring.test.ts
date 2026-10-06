import { describe, expect, it } from "vitest";
import RegionPage, { generateMetadata as regionGenerateMetadata } from "@/app/(site)/g/[category]/[region]/page";
import CategoryPage from "@/app/(site)/g/[category]/page";
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

describe("/g/ region page FAQ wiring", () => {
  const bodyProps = (region: string) => ({
    params: Promise.resolve({ category: "wilderness-therapy", region }),
    searchParams: Promise.resolve({}),
  });

  /** Cycle-safe deep collection of every string in a React element tree
   * (text nodes + dangerouslySetInnerHTML payloads), skipping functions. */
  function allStrings(node: unknown, seen = new Set<unknown>(), acc: string[] = []): string[] {
    if (typeof node === "string") {
      acc.push(node);
    } else if (node && typeof node === "object" && !seen.has(node)) {
      seen.add(node);
      if (Array.isArray(node)) {
        for (const v of node) allStrings(v, seen, acc);
      } else {
        for (const v of Object.values(node)) allStrings(v, seen, acc);
      }
    }
    return acc;
  }

  it("renders FAQ copy + FAQPage JSON-LD from the matched CRC row (tokens localized)", async () => {
    // Mock CRC row: wilderness × CA/SOUTHERN → matches the San Diego city page.
    const tree = allStrings(await RegionPage(bodyProps("San-Diego-California-CA"))).join("\n");
    expect(tree).toContain("Frequently asked questions");
    expect(tree).toContain('"@type":"FAQPage"');
    // {{in region}} rendered for the city, not left as a token.
    expect(tree).toContain("wilderness therapy program in San Diego, CA cost");
    expect(tree).not.toContain("{{in region}}");
  });

  it("omits the FAQ section when the region has no matched CRC row", async () => {
    // Texas state page: mock has no TX row → no FAQ, no FAQPage schema.
    const tree = allStrings(await RegionPage(bodyProps("Texas-TX"))).join("\n");
    expect(tree).not.toContain("FAQPage");
    expect(tree).not.toContain("Frequently asked questions");
  });
});

describe("/g/ position image rendering", () => {
  /** Cycle-safe deep collection of every string (same walker as above). */
  function allStrings(node: unknown, seen = new Set<unknown>(), acc: string[] = []): string[] {
    if (typeof node === "string") {
      acc.push(node);
    } else if (node && typeof node === "object" && !seen.has(node)) {
      seen.add(node);
      if (Array.isArray(node)) {
        for (const v of node) allStrings(v, seen, acc);
      } else {
        for (const v of Object.values(node)) allStrings(v, seen, acc);
      }
    }
    return acc;
  }

  const regionProps = (category: string, region: string) => ({
    params: Promise.resolve({ category, region }),
    searchParams: Promise.resolve({}),
  });

  it("renders the STATE image with Media Library text on a state page", async () => {
    const tree = allStrings(await RegionPage(regionProps("wilderness-therapy", "Texas-TX"))).join("\n");
    expect(tree).toContain("/api/assets/img-wilderness-state");
    expect(tree).toContain("alt for STATE image");
    expect(tree).toContain("STATE image title");
    expect(tree).toContain("caption for STATE image");
    expect(tree).not.toContain("/api/assets/img-wilderness-city");
  });

  it("renders the CITY image (not the state one) on a city page", async () => {
    const tree = allStrings(await RegionPage(regionProps("wilderness-therapy", "San-Diego-California-CA"))).join("\n");
    expect(tree).toContain("/api/assets/img-wilderness-city");
    expect(tree).toContain("alt for CITY image");
    expect(tree).not.toContain("/api/assets/img-wilderness-state");
  });

  it("renders no image when the category has no position image", async () => {
    const tree = allStrings(await RegionPage(regionProps("christian-boarding-schools", "Texas-TX"))).join("\n");
    expect(tree).not.toContain("/api/assets/");
  });

  it("renders the PRIMARY image on the category parent page", async () => {
    const tree = allStrings(await CategoryPage({ params: Promise.resolve({ category: "wilderness-therapy" }) })).join("\n");
    expect(tree).toContain("/api/assets/img-wilderness-primary");
    expect(tree).toContain("alt for PRIMARY image");
  });

  it("renders no parent image when none is uploaded", async () => {
    const tree = allStrings(await CategoryPage({ params: Promise.resolve({ category: "christian-boarding-schools" }) })).join("\n");
    expect(tree).not.toContain("/api/assets/");
  });
});

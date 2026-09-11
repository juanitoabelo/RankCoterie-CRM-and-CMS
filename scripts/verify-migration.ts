#!/usr/bin/env npx tsx
/**
 * Canopy V2 — Post-migration verification script (Phase 0).
 *
 * Compares row counts between the legacy MySQL source and the Canopy V2
 * PostgreSQL target. Generates a parity report per table.
 *
 * Usage:
 *   npx tsx scripts/verify-migration.ts \
 *     --mysql-url "mysql://user:pass@host:3306/source_db" \
 *     --tenant-id "tenant-masternet" \
 *     [--json]  // output JSON instead of table
 */

import mysql from "mysql2/promise";
import { PrismaClient } from "@prisma/client";

function arg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const MYSQL_URL = arg("mysql-url", process.env.LEGACY_MYSQL_URL);
const TENANT_ID = arg("tenant-id", "tenant-masternet");
const JSON_OUTPUT = process.argv.includes("--json");

if (!MYSQL_URL) {
  console.error("Usage: npx tsx scripts/verify-migration.ts --mysql-url <URL> [--tenant-id ...]");
  process.exit(1);
}

const prisma = new PrismaClient();

interface ParityRow {
  table: string;
  legacyCount: number;
  v2Count: number;
  match: boolean;
  delta: number;
  note?: string;
}

async function verify() {
  const src = await mysql.createConnection(MYSQL_URL!);
  const results: ParityRow[] = [];

  async function compare(
    label: string,
    legacySql: string,
    v2Count: () => Promise<number>,
    note?: string
  ) {
    const [rows] = await src.query(legacySql);
    const legacyCount = (rows as any[])[0]?.count ?? 0;
    const v2 = await v2Count();
    const match = legacyCount === v2;
    const delta = v2 - legacyCount;
    results.push({ table: label, legacyCount, v2Count: v2, match, delta, note });
  }

  // Regions
  await compare(
    "tblRegions → Region",
    "SELECT COUNT(*) as count FROM tblRegions",
    () => prisma.region.count({ where: { tenantId: TENANT_ID } })
  );

  // Categories
  await compare(
    "tblSearchCategoryParent → Category",
    "SELECT COUNT(*) as count FROM tblSearchCategoryParent",
    () => prisma.category.count({ where: { tenantId: TENANT_ID } })
  );

  // Listings
  await compare(
    "tblSearchListing → Listing",
    "SELECT COUNT(*) as count FROM tblSearchListing",
    () => prisma.listing.count({ where: { tenantId: TENANT_ID } })
  );

  // Feeds
  await compare(
    "tblFeeds → Feed",
    "SELECT COUNT(*) as count FROM tblFeeds",
    () => prisma.feed.count()
  );

  // FeedItems
  await compare(
    "tblFeedListings → FeedItem",
    "SELECT COUNT(*) as count FROM tblFeedListings",
    () => prisma.feedItem.count()
  );

  // SearchArticles
  await compare(
    "tblSearchArticles → SearchArticle",
    "SELECT COUNT(*) as count FROM tblSearchArticles",
    () => prisma.searchArticle.count({ where: { tenantId: TENANT_ID } })
  );

  // Users
  await compare(
    "tblUsers → User",
    "SELECT COUNT(*) as count FROM tblUsers",
    () => prisma.user.count({ where: { tenantId: TENANT_ID } })
  );

  // Leads
  await compare(
    "tblLeads → Lead",
    "SELECT COUNT(*) as count FROM tblLeads",
    () => prisma.lead.count({ where: { tenantId: TENANT_ID } })
  );

  // Pages
  await compare(
    "tblPages → Page",
    "SELECT COUNT(*) as count FROM tblPages",
    () => prisma.page.count({ where: { tenantId: TENANT_ID } })
  );

  // Menus
  await compare(
    "tblMenuBuilder → Menu",
    "SELECT COUNT(*) as count FROM tblMenuBuilder",
    () => prisma.menu.count({ where: { tenantId: TENANT_ID } })
  );

  // Exclusions
  await compare(
    "tblExclusions → ExcludedCompany",
    "SELECT COUNT(*) as count FROM tblExclusions",
    () => prisma.excludedCompany.count({ where: { tenantId: TENANT_ID } })
  );

  // CategoryRegionContent
  await compare(
    "tblSearchCategoryRegionContent → CategoryRegionContent",
    "SELECT COUNT(*) as count FROM tblSearchCategoryRegionContent",
    () => prisma.categoryRegionContent.count()
  );

  // Listing-Category mappings
  await compare(
    "tblSearchListingCategories → ListingCategory",
    "SELECT COUNT(*) as count FROM tblSearchListingCategories",
    () => prisma.listingCategory.count({ where: { listing: { tenantId: TENANT_ID } } })
  );

  // Listing-Region mappings
  await compare(
    "tblSearchListingRegions → ListingRegion",
    "SELECT COUNT(*) as count FROM tblSearchListingRegions",
    () => prisma.listingRegion.count({ where: { listing: { tenantId: TENANT_ID } } })
  );

  // Topics → ContentTemplate
  await compare(
    "tblSearchTopics → ContentTemplate",
    "SELECT COUNT(*) as count FROM tblSearchTopics",
    () => prisma.contentTemplate.count({ where: { tenantId: TENANT_ID } })
  );

  // Company
  await compare(
    "tblCompany → Company",
    "SELECT COUNT(*) as count FROM tblCompany",
    () => prisma.company.count({ where: { tenantId: TENANT_ID } })
  );

  await src.end();
  await prisma.$disconnect();

  // Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`\n=== Migration Parity Report ===`);
    console.log(`Tenant: ${TENANT_ID}\n`);

    const passed = results.filter((r) => r.match);
    const failed = results.filter((r) => !r.match);

    for (const r of results) {
      const icon = r.match ? "✓" : "✗";
      const deltaStr = r.delta === 0 ? "" : ` (delta: ${r.delta > 0 ? "+" : ""}${r.delta})`;
      const noteStr = r.note ? ` — ${r.note}` : "";
      console.log(`  ${icon} ${r.table}: legacy=${r.legacyCount} v2=${r.v2Count}${deltaStr}${noteStr}`);
    }

    console.log(`\n  Passed: ${passed.length}/${results.length}`);
    if (failed.length > 0) {
      console.log(`  FAILED: ${failed.length} tables have count mismatches`);
      process.exitCode = 1;
    } else {
      console.log(`  All tables match ✓`);
    }
  }
}

verify().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});

#!/usr/bin/env npx tsx
/**
 * Rank Coterie — Post-migration verification script (Phase 0).
 *
 * Compares row counts between the legacy MySQL source and the Rank Coterie
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

  /** Like compare(), but tolerates a missing legacy table (recorded as a note). */
  async function tryCompare(
    label: string,
    legacySql: string,
    v2Count: () => Promise<number>
  ) {
    try {
      await compare(label, legacySql, v2Count);
    } catch {
      const v2 = await v2Count();
      results.push({
        table: label,
        legacyCount: 0,
        v2Count: v2,
        match: v2 === 0,
        delta: v2,
        note: "legacy table not found — check the source dump for the real table name",
      });
    }
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

  // Lead notes
  await tryCompare(
    "tblLeadNotes → LeadNote",
    "SELECT COUNT(*) as count FROM tblLeadNotes",
    () => prisma.leadNote.count({ where: { lead: { tenantId: TENANT_ID } } })
  );

  // To-do items (legacy table name is best-effort)
  await tryCompare(
    "tblToDos → ToDo",
    "SELECT COUNT(*) as count FROM tblToDos",
    () => prisma.toDo.count({ where: { lead: { tenantId: TENANT_ID } } })
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

  // --- Referential integrity + intake vocabulary (not row-count parity) ---
  const integrity: { label: string; count: number; note: string }[] = [];
  const leads = await prisma.lead.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, assignedToId: true, closeUserId: true, intake: true },
  });
  const userIds = new Set(
    (
      await prisma.user.findMany({ where: { tenantId: TENANT_ID }, select: { id: true } })
    ).map((u) => u.id)
  );
  integrity.push({
    label: "Lead.assignedToId → User",
    count: leads.filter((l) => l.assignedToId && !userIds.has(l.assignedToId)).length,
    note: "assigned rep ids must use the migrated legacy-users-{id} form",
  });
  integrity.push({
    label: "Lead.closeUserId → User",
    count: leads.filter((l) => l.closeUserId && !userIds.has(l.closeUserId)).length,
    note: "closer ids must use the migrated legacy-users-{id} form",
  });
  const noteRows = await prisma.leadNote.findMany({
    where: { lead: { tenantId: TENANT_ID } },
    select: { id: true, userId: true },
  });
  integrity.push({
    label: "LeadNote.userId → User",
    count: noteRows.filter((n) => n.userId && !userIds.has(n.userId)).length,
    note: "note authors must use the migrated legacy-users-{id} form",
  });
  // Keys written by older migration versions — re-run migrate-legacy to normalize.
  const STALE_INTAKE_KEYS = [
    "insurance", "diagnosis", "childAge", "budget", "traumaHistory", "courtInvolvement",
    "patientName", "behaviors", "pastTreatments", "treatmentResponse", "grades",
    "isDrugUse", "isViolent", "isCourtOrdered", "criminalRecord",
  ];
  integrity.push({
    label: "Lead.intake uses current field keys",
    count: leads.filter((l) => {
      const intake = (l.intake ?? {}) as Record<string, unknown>;
      return STALE_INTAKE_KEYS.some((k) => k in intake);
    }).length,
    note: "leads still carrying pre-alignment intake keys",
  });

  await src.end();
  await prisma.$disconnect();

  // Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ results, integrity }, null, 2));
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

    console.log(`\n=== Integrity ===`);
    let integrityFailed = 0;
    for (const i of integrity) {
      const icon = i.count === 0 ? "✓" : "✗";
      if (i.count !== 0) integrityFailed++;
      const countStr = i.count === 0 ? "0 issues" : `${i.count} issue${i.count === 1 ? "" : "s"}`;
      console.log(`  ${icon} ${i.label}: ${countStr} — ${i.note}`);
    }

    console.log(`\n  Passed: ${passed.length}/${results.length}`);
    if (failed.length > 0 || integrityFailed > 0) {
      console.log(
        `  FAILED: ${failed.length} table mismatches, ${integrityFailed} integrity checks`
      );
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

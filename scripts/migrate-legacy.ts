#!/usr/bin/env npx tsx
/**
 * Canopy V2 — Legacy MariaDB → PostgreSQL migration script (Phase 0).
 *
 * Reads from a MySQL source (dump loaded into a staging DB or live) and writes
 * to the Canopy V2 PostgreSQL via Prisma. Schema-driven and tenant-repeatable:
 * each invocation targets one tenant.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy.ts \
 *     --mysql-url "mysql://user:pass@host:3306/source_db" \
 *     --tenant-id "tenant-masternet" \
 *     --tenant-name "MasterNet" \
 *     --tenant-domain "masternet.org" \
 *     [--dry-run] \
 *     [--mask-pii]
 *
 * Prerequisites:
 *   npm install mysql2  (in the repo root or scripts/)
 *
 * The script is idempotent per tenant: re-running replaces all rows for the
 * given tenantId (cascade-safe because we delete child rows first).
 */

import mysql from "mysql2/promise";
import { PrismaClient, Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function arg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

const MYSQL_URL = arg("mysql-url", process.env.LEGACY_MYSQL_URL);
const TENANT_ID = arg("tenant-id", "tenant-masternet");
const TENANT_NAME = arg("tenant-name", "MasterNet");
const TENANT_DOMAIN = arg("tenant-domain", "masternet.org");
const DRY_RUN = process.argv.includes("--dry-run");
const MASK_PII = process.argv.includes("--mask-pii");

if (!MYSQL_URL) {
  console.error("Usage: npx tsx scripts/migrate-legacy.ts --mysql-url <URL> [--tenant-id ...]");
  process.exit(1);
}

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Force-decode latin1 binary blobs as utf8. */
function fixCharset(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val);
  try {
    return Buffer.from(s, "latin1").toString("utf8");
  } catch {
    return s;
  }
}

/** Generate a URL-safe slug from a title. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 120);
}

/** Generate a CUID-like stable ID from legacy numeric ID. */
function legacyId(table: string, id: number | string): string {
  return `legacy-${table}-${id}`;
}

/** Mask PII fields for dev/staging environments. */
function mask(val: string | null | undefined): string | null {
  if (!val || !MASK_PII) return val ?? null;
  return val.replace(/./g, "*");
}

/** Placeholder argon2 hash — real migration must rehash via a one-time reset flow. */
function placeholderHash(): string {
  // argon2 placeholder — users MUST reset passwords after migration
  return "$argon2id$v=19$m=65536,t=3,p=1$placeholder$REHASH_REQUIRED";
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------

async function migrate() {
  console.log(`\n=== Canopy V2 Legacy Migration ===`);
  console.log(`Tenant: ${TENANT_ID} (${TENANT_NAME} / ${TENANT_DOMAIN})`);
  console.log(`MySQL:  ${MYSQL_URL!.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`);
  console.log(`Dry run: ${DRY_RUN}  |  Mask PII: ${MASK_PII}\n`);

  const src = await mysql.createConnection(MYSQL_URL!);

  // Detect charset of legacy tables
  const [charsetRows] = await src.query(
    "SELECT TABLE_NAME, CCSA.CHARACTER_SET_NAME FROM INFORMATION_SCHEMA.TABLES T JOIN INFORMATION_SCHEMA.COLLATION_CHARACTER_SET_APPLICABILITY CCSA ON T.TABLE_COLLATION = CCSA.COLLATION_NAME WHERE T.TABLE_SCHEMA = DATABASE() AND T.TABLE_TYPE = 'BASE TABLE'"
  );
  const tableCharsets: Record<string, string> = {};
  for (const row of charsetRows as any[]) {
    tableCharsets[row.TABLE_NAME] = row.CHARACTER_SET_NAME;
  }
  const latin1Tables = Object.entries(tableCharsets)
    .filter(([, cs]) => cs === "latin1")
    .map(([t]) => t);
  if (latin1Tables.length > 0) {
    console.log(`⚠  latin1 tables detected (charset cleanup will apply): ${latin1Tables.join(", ")}`);
  }

  // Helper to query legacy table
  async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const [rows] = await src.query(sql, params);
    return rows as T[];
  }

  // Wrap everything in a Prisma transaction
  if (DRY_RUN) {
    console.log("\n[DRY RUN] Would execute the following migrations:\n");
  }

  const tx = DRY_RUN ? null : prisma;

  // ---- 1. Tenant ----
  console.log("1. Migrating Tenant...");
  if (!DRY_RUN) {
    await prisma.tenant.upsert({
      where: { id: TENANT_ID },
      create: { id: TENANT_ID, name: TENANT_NAME, domainKey: TENANT_DOMAIN, theme: {} },
      update: { name: TENANT_NAME, domainKey: TENANT_DOMAIN },
    });
  }
  console.log("   ✓ Tenant ready");

  // ---- 2. Regions (tblRegions) ----
  console.log("2. Migrating Regions (tblRegions)...");
  const legacyRegions = await query<{
    RegionID: number;
    RegionCode: string;
    DomainKey: string;
    State: string;
    StateFull: string;
    City: string | null;
    AreaPart: string | null;
    Custom1: string | null;
    Custom2: string | null;
    Priority: number;
    ZipCodes: string | null;
  }>("SELECT * FROM tblRegions ORDER BY RegionID");

  const regionIdMap = new Map<number, string>(); // legacy ID → new ID

  if (!DRY_RUN) {
    await prisma.region.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  for (const r of legacyRegions) {
    const newId = legacyId("regions", r.RegionID);
    regionIdMap.set(r.RegionID, newId);
    const slug = r.DomainKey || slugify(`${r.City ?? ""}-${r.StateFull}-${r.State}`);

    if (!DRY_RUN) {
      await prisma.region.create({
        data: {
          id: newId,
          tenantId: TENANT_ID,
          state: r.State,
          stateFull: r.StateFull,
          city: fixCharset(r.City),
          areaPart: (r.AreaPart as any) ?? null,
          slug,
          custom1: fixCharset(r.Custom1),
          custom2: fixCharset(r.Custom2),
          priority: r.Priority ?? 999,
          zipCodes: r.ZipCodes ? r.ZipCodes.split(",").map((z) => z.trim()) : [],
        },
      });
    }
  }
  console.log(`   ✓ ${legacyRegions.length} regions migrated`);

  // ---- 3. Categories (tblSearchCategoryParent + tblSearchCategory*) ----
  console.log("3. Migrating Categories (tblSearchCategory*)...");
  const legacyCategories = await query<{
    SearchCategoryID: number;
    DomainKey: string;
    Title: string;
    Description: string | null;
    Author: string | null;
    ParentID: number | null;
    StateInit: string | null;
    StateDesc: string | null;
    CityInit: string | null;
    CityDesc: string | null;
  }>("SELECT * FROM tblSearchCategoryParent ORDER BY SearchCategoryID");

  const categoryIdMap = new Map<number, string>();

  if (!DRY_RUN) {
    await prisma.category.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  // First pass: create all categories
  for (const c of legacyCategories) {
    const newId = legacyId("categories", c.SearchCategoryID);
    categoryIdMap.set(c.SearchCategoryID, newId);

    if (!DRY_RUN) {
      await prisma.category.create({
        data: {
          id: newId,
          tenantId: TENANT_ID,
          slug: c.DomainKey || slugify(c.Title),
          title: fixCharset(c.Title) ?? c.Title,
          description: fixCharset(c.Description),
          author: fixCharset(c.Author),
          stateInit: fixCharset(c.StateInit),
          stateDesc: fixCharset(c.StateDesc),
          cityInit: fixCharset(c.CityInit),
          cityDesc: fixCharset(c.CityDesc),
          sections: {},
        },
      });
    }
  }

  // Second pass: set parent relationships
  for (const c of legacyCategories) {
    if (c.ParentID && categoryIdMap.has(c.ParentID)) {
      if (!DRY_RUN) {
        await prisma.category.update({
          where: { id: categoryIdMap.get(c.ParentID)! },
          data: { parentId: categoryIdMap.get(c.ParentID) },
        });
      }
    }
  }
  console.log(`   ✓ ${legacyCategories.length} categories migrated`);

  // ---- 4. CategoryRegionContent (tblSearchCategoryRegionContent) ----
  console.log("4. Migrating CategoryRegionContent...");
  const legacyContent = await query<{
    ID: number;
    SearchCategoryID: number;
    State: string;
    AreaPart: string;
    CustomText: string;
  }>("SELECT * FROM tblSearchCategoryRegionContent").catch(() => []);

  if (!DRY_RUN) {
    await prisma.categoryRegionContent.deleteMany({});
  }

  let contentCount = 0;
  for (const c of legacyContent) {
    const catId = categoryIdMap.get(c.SearchCategoryID);
    if (!catId) continue;

    if (!DRY_RUN) {
      await prisma.categoryRegionContent.create({
        data: {
          id: legacyId("crc", c.ID),
          categoryId: catId,
          state: c.State,
          areaPart: (c.AreaPart as any) ?? "NORTHERN",
          customText: fixCharset(c.CustomText) ?? "",
        },
      }).catch(() => {}); // skip duplicates
    }
    contentCount++;
  }
  console.log(`   ✓ ${contentCount} category-region-content entries migrated`);

  // ---- 5. CategoryRegionFeed (tblSearchCategoryRegionFeeds) ----
  console.log("5. Migrating CategoryRegionFeed...");
  const legacyCatFeeds = await query<{
    ID: number;
    SearchCategoryID: number;
    State: string;
    AreaPart: string;
    FeedID: number;
  }>("SELECT * FROM tblSearchCategoryRegionFeeds").catch(() => []);

  if (!DRY_RUN) {
    await prisma.categoryRegionFeed.deleteMany({});
  }

  let catFeedCount = 0;
  for (const f of legacyCatFeeds) {
    const catId = categoryIdMap.get(f.SearchCategoryID);
    if (!catId) continue;

    if (!DRY_RUN) {
      await prisma.categoryRegionFeed.create({
        data: {
          id: legacyId("crf", f.ID),
          categoryId: catId,
          state: f.State,
          areaPart: (f.AreaPart as any) ?? "NORTHERN",
          feedId: legacyId("feeds", f.FeedID),
        },
      }).catch(() => {});
    }
    catFeedCount++;
  }
  console.log(`   ✓ ${catFeedCount} category-region-feed entries migrated`);

  // ---- 6. Listings (tblSearchListing + related tables) ----
  console.log("6. Migrating Listings (tblSearchListing*)...");
  const legacyListings = await query<{
    SearchListingID: number;
    Title: string;
    DomainKey: string | null;
    Content: string | null;
    Keywords: string | null;
    Description: string | null;
    IsArticlePage: number;
    ArticleTemplate: string | null;
    IsLandingPage: number;
    CompanyName: string | null;
    Phone: string | null;
    Email: string | null;
    Website: string | null;
    Address: string | null;
    City: string | null;
    State: string | null;
    Zip: string | null;
    AvatarImage: string | null;
    FeedImage: string | null;
    VideoUrl: string | null;
    Summary: string | null;
    Staff: string | null;
    ClientFocus: string | null;
    Credentials: string | null;
    IsSlidingScale: number;
    FreeInitial: number;
    HasMalpractice: number;
    ClientGender: string | null;
    Religion: string | null;
    UserID: number | null;
    CreatedAt: string | null;
  }>("SELECT * FROM tblSearchListing ORDER BY SearchListingID");

  if (!DRY_RUN) {
    // Delete child rows first (FK order)
    await prisma.listingCategory.deleteMany({ where: { listing: { tenantId: TENANT_ID } } });
    await prisma.listingRegion.deleteMany({ where: { listing: { tenantId: TENANT_ID } } });
    await prisma.listingSubscription.deleteMany({ where: { listing: { tenantId: TENANT_ID } } });
    await prisma.listing.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  const listingIdMap = new Map<number, string>();
  let listingCount = 0;

  for (const l of legacyListings) {
    const newId = legacyId("listings", l.SearchListingID);
    listingIdMap.set(l.SearchListingID, newId);
    const slug = l.DomainKey || slugify(l.Title);

    // Fetch related staff/credentials/insurance/testimonials from sub-tables
    const [staffRows] = await src.query(
      "SELECT * FROM tblSearchListingStaff WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);

    const [credRows] = await src.query(
      "SELECT * FROM tblSearchListingCredentials WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);

    const [insRows] = await src.query(
      "SELECT * FROM tblSearchListingInsurance WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);

    const [testRows] = await src.query(
      "SELECT * FROM tblSearchListingTestimonials WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);

    // Aggregate staff info
    const staffHtml = (staffRows as any[])
      .map((s: any) => `<strong>${fixCharset(s.Name) ?? ""}</strong>: ${fixCharset(s.Bio) ?? ""}`)
      .join("\n");

    // Aggregate credentials
    const credsHtml = (credRows as any[])
      .map((c: any) => fixCharset(c.Credential) ?? "")
      .filter(Boolean)
      .join(", ");

    // Aggregate insurance
    const insJson = (insRows as any[]).reduce((acc: any, i: any) => {
      acc[fixCharset(i.InsuranceType) ?? "unknown"] = true;
      return acc;
    }, {});

    // Aggregate testimonials
    const testimonials = (testRows as any[]).map((t: any) => ({
      author: fixCharset(t.Author),
      text: fixCharset(t.Text),
    }));

    // Aggregate pricing from sub-tables
    const [priceRows] = await src.query(
      "SELECT * FROM tblSearchListingPricing WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);

    const pricing = (priceRows as any[]).reduce((acc: any, p: any) => {
      acc[`Price${p.Level ?? ""}`] = p.Price;
      acc[`Duration${p.Level ?? ""}`] = p.Duration;
      return acc;
    }, {});

    // Aggregate age groups
    const [ageRows] = await src.query(
      "SELECT * FROM tblSearchListingAgeGroups WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);
    const ageGroups = (ageRows as any[]).reduce((acc: any, a: any) => {
      acc[fixCharset(a.AgeGroup) ?? "unknown"] = true;
      return acc;
    }, {});

    // Aggregate languages
    const [langRows] = await src.query(
      "SELECT * FROM tblSearchListingLanguages WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);
    const languages = (langRows as any[]).map((la: any) => fixCharset(la.Language)).filter(Boolean);

    // Social media
    const [socialRows] = await src.query(
      "SELECT * FROM tblSearchListingSocialMedia WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);
    const social = (socialRows as any[]).reduce((acc: any, s: any) => {
      acc[fixCharset(s.Platform)?.toLowerCase() ?? "unknown"] = fixCharset(s.Url);
      return acc;
    }, {});

    // Payment methods
    const [payRows] = await src.query(
      "SELECT * FROM tblSearchListingPaymentMethods WHERE SearchListingID = ?",
      [l.SearchListingID]
    ).catch(() => [[]]);
    const acceptsPayment = (payRows as any[]).reduce((acc: any, p: any) => {
      acc[fixCharset(p.Method) ?? "unknown"] = true;
      return acc;
    }, {});

    if (!DRY_RUN) {
      await prisma.listing.create({
        data: {
          id: newId,
          tenantId: TENANT_ID,
          tier: "FREE", // legacy rows → FREE tier
          status: "LIVE",
          title: fixCharset(l.Title) ?? l.Title,
          slug,
          domainKey: fixCharset(l.DomainKey),
          contentHtml: fixCharset(l.Content),
          keywords: fixCharset(l.Keywords),
          description: fixCharset(l.Description),
          isArticlePage: !!l.IsArticlePage,
          articleTemplate: fixCharset(l.ArticleTemplate),
          isLandingPage: !!l.IsLandingPage,
          companyName: fixCharset(l.CompanyName),
          phone: fixCharset(l.Phone),
          email: MASK_PII ? mask(l.Email) : fixCharset(l.Email),
          website: fixCharset(l.Website),
          address: fixCharset(l.Address),
          city: fixCharset(l.City),
          state: fixCharset(l.State),
          zip: fixCharset(l.Zip),
          avatarImage: fixCharset(l.AvatarImage),
          feedImage: fixCharset(l.FeedImage),
          videoUrl: fixCharset(l.VideoUrl),
          summary: fixCharset(l.Summary),
          staff: staffHtml || fixCharset(l.Staff),
          clientFocus: fixCharset(l.ClientFocus),
          credentials: credsHtml || fixCharset(l.Credentials),
          isSlidingScale: !!l.IsSlidingScale,
          freeInitial: !!l.FreeInitial,
          acceptsPayment,
          hasMalpractice: !!l.HasMalpractice,
          social,
          ageGroups,
          clientGender: fixCharset(l.ClientGender),
          religion: fixCharset(l.Religion),
          languages,
          pricing,
          authorId: l.UserID ? String(l.UserID) : null,
          createdAt: l.CreatedAt ? new Date(l.CreatedAt) : new Date(),
        },
      });
    }
    listingCount++;
  }
  console.log(`   ✓ ${listingCount} listings migrated (tier=FREE, no subscription)`);

  // ---- 6b. Listing ↔ Category mapping ----
  console.log("6b. Migrating ListingCategory mappings...");
  const legacyListingsCats = await query<{
    SearchListingID: number;
    SearchCategoryID: number;
  }>("SELECT SearchListingID, SearchCategoryID FROM tblSearchListingCategories").catch(() => []);

  let mappingCount = 0;
  for (const lc of legacyListingsCats) {
    const listingId = listingIdMap.get(lc.SearchListingID);
    const categoryId = categoryIdMap.get(lc.SearchCategoryID);
    if (!listingId || !categoryId) continue;

    if (!DRY_RUN) {
      await prisma.listingCategory.create({
        data: { listingId, categoryId },
      }).catch(() => {}); // skip duplicates
    }
    mappingCount++;
  }
  console.log(`   ✓ ${mappingCount} listing-category mappings`);

  // ---- 6c. Listing ↔ Region mapping ----
  console.log("6c. Migrating ListingRegion mappings...");
  const legacyListingsRegions = await query<{
    SearchListingID: number;
    RegionID: number;
  }>("SELECT SearchListingID, RegionID FROM tblSearchListingRegions").catch(() => []);

  let regionMappingCount = 0;
  for (const lr of legacyListingsRegions) {
    const listingId = listingIdMap.get(lr.SearchListingID);
    const regionId = regionIdMap.get(lr.RegionID);
    if (!listingId || !regionId) continue;

    if (!DRY_RUN) {
      await prisma.listingRegion.create({
        data: { listingId, regionId },
      }).catch(() => {});
    }
    regionMappingCount++;
  }
  console.log(`   ✓ ${regionMappingCount} listing-region mappings`);

  // ---- 7. Feeds (tblFeeds) ----
  console.log("7. Migrating Feeds (tblFeeds)...");
  const legacyFeeds = await query<{
    FeedID: number;
    Name: string;
    DomainKey: string | null;
    URL: string | null;
    Type: string | null;
    Status: string | null;
    LastFetchedAt: string | null;
  }>("SELECT * FROM tblFeeds").catch(() => []);

  if (!DRY_RUN) {
    await prisma.feedItem.deleteMany({});
    await prisma.feed.deleteMany({});
  }

  for (const f of legacyFeeds) {
    if (!DRY_RUN) {
      await prisma.feed.create({
        data: {
          id: legacyId("feeds", f.FeedID),
          tenantId: TENANT_ID,
          name: fixCharset(f.Name) ?? f.Name,
          domainKey: fixCharset(f.DomainKey),
          url: fixCharset(f.URL),
          type: fixCharset(f.Type) ?? "RSS",
          status: fixCharset(f.Status) ?? "ACTIVE",
          lastFetchedAt: f.LastFetchedAt ? new Date(f.LastFetchedAt) : null,
        },
      });
    }
  }
  console.log(`   ✓ ${legacyFeeds.length} feeds migrated`);

  // ---- 7b. FeedItems (tblFeedListings) ----
  console.log("7b. Migrating FeedItems (tblFeedListings)...");
  const legacyFeedItems = await query<{
    FeedListingID: number;
    FeedID: number;
    Title: string;
    URL: string | null;
    Body: string | null;
    Author: string | null;
    Keywords: string | null;
    FeedDate: string | null;
    Status: string | null;
  }>("SELECT * FROM tblFeedListings").catch(() => []);

  let feedItemCount = 0;
  for (const fi of legacyFeedItems) {
    const fingerprint = createHash("sha1")
      .update(`${fi.Title}|${fi.URL ?? ""}|${fi.FeedDate ?? ""}`)
      .digest("hex");

    if (!DRY_RUN) {
      await prisma.feedItem.create({
        data: {
          id: legacyId("feeditems", fi.FeedListingID),
          feedId: legacyId("feeds", fi.FeedID),
          fingerprint,
          title: fixCharset(fi.Title) ?? fi.Title,
          url: fixCharset(fi.URL),
          body: fixCharset(fi.Body),
          author: fixCharset(fi.Author),
          keywords: fixCharset(fi.Keywords),
          feedDate: fi.FeedDate ? new Date(fi.FeedDate) : null,
          status: fixCharset(fi.Status) ?? "NEW",
        },
      }).catch(() => {});
    }
    feedItemCount++;
  }
  console.log(`   ✓ ${feedItemCount} feed items migrated`);

  // ---- 8. SearchArticles (tblSearchArticles) ----
  console.log("8. Migrating SearchArticles (tblSearchArticles)...");
  const legacyArticles = await query<{
    SearchArticleID: number;
    SearchListingID: number | null;
    UserID: number | null;
    Title: string;
    Body: string | null;
    DomainKey: string | null;
    MetaDesc: string | null;
    Tags: string | null;
    FeedImage: string | null;
    IsApproved: number;
    IsRejected: number;
    ReviewedByID: number | null;
    ReviewedAt: string | null;
    PostDate: string | null;
    CreatedAt: string | null;
  }>("SELECT * FROM tblSearchArticles").catch(() => []);

  if (!DRY_RUN) {
    await prisma.searchArticle.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  let articleCount = 0;
  for (const a of legacyArticles) {
    if (!DRY_RUN) {
      await prisma.searchArticle.create({
        data: {
          id: legacyId("articles", a.SearchArticleID),
          tenantId: TENANT_ID,
          listingId: a.SearchListingID ? listingIdMap.get(a.SearchListingID) ?? null : null,
          authorId: a.UserID ? String(a.UserID) : null,
          title: fixCharset(a.Title) ?? a.Title,
          body: fixCharset(a.Body),
          domainKey: fixCharset(a.DomainKey),
          metaDesc: fixCharset(a.MetaDesc),
          tags: fixCharset(a.Tags),
          feedImage: fixCharset(a.FeedImage),
          isApproved: !!a.IsApproved,
          isRejected: !!a.IsRejected,
          reviewedById: a.ReviewedByID ? String(a.ReviewedByID) : null,
          reviewedAt: a.ReviewedAt ? new Date(a.ReviewedAt) : null,
          postDate: a.PostDate ? new Date(a.PostDate) : null,
          createdAt: a.CreatedAt ? new Date(a.CreatedAt) : new Date(),
        },
      });
    }
    articleCount++;
  }
  console.log(`   ✓ ${articleCount} search articles migrated`);

  // ---- 9. Topics (tblSearchTopics) ----
  console.log("9. Migrating Topics (tblSearchTopics)...");
  const legacyTopics = await query<{
    TopicID: number;
    Title: string;
    Body: string | null;
    SearchCategoryID: number | null;
    SearchListingID: number | null;
  }>("SELECT * FROM tblSearchTopics").catch(() => []);

  // Topics map to ContentTemplate
  if (!DRY_RUN) {
    await prisma.contentVariant.deleteMany({});
    await prisma.contentTemplate.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  let topicCount = 0;
  for (const t of legacyTopics) {
    if (!DRY_RUN) {
      await prisma.contentTemplate.create({
        data: {
          id: legacyId("topics", t.TopicID),
          tenantId: TENANT_ID,
          slug: slugify(t.Title),
          title: fixCharset(t.Title) ?? t.Title,
          body: fixCharset(t.Body) ?? "",
          categoryId: t.SearchCategoryID ? categoryIdMap.get(t.SearchCategoryID) ?? null : null,
          status: "DRAFT",
        },
      });
    }
    topicCount++;
  }
  console.log(`   ✓ ${topicCount} topics → ContentTemplates`);

  // ---- 10. Users (tblUsers) ----
  console.log("10. Migrating Users (tblUsers)...");
  const legacyUsers = await query<{
    UserID: number;
    Email: string;
    Password: string;
    FirstName: string | null;
    LastName: string | null;
    Company: string | null;
    Department: string | null;
    IsRep: number;
    IsCloser: number;
    AuthorUrl: string | null;
    AuthorBio: string | null;
    ImageUrl: string | null;
    JobTitle: string | null;
    Phone: string | null;
    IncludeInStaffPages: number;
    StaffPageOrHomePage: string | null;
    Active: number;
    CreatedAt: string | null;
  }>("SELECT * FROM tblUsers").catch(() => []);

  if (!DRY_RUN) {
    await prisma.userRole.deleteMany({ where: { user: { tenantId: TENANT_ID } } });
    await prisma.user.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  let userCount = 0;
  for (const u of legacyUsers) {
    if (!DRY_RUN) {
      await prisma.user.create({
        data: {
          id: legacyId("users", u.UserID),
          tenantId: TENANT_ID,
          email: MASK_PII ? mask(u.Email)! : u.Email,
          passwordHash: placeholderHash(),
          firstName: fixCharset(u.FirstName),
          lastName: fixCharset(u.LastName),
          company: fixCharset(u.Company),
          department: fixCharset(u.Department),
          isRep: !!u.IsRep,
          isCloser: !!u.IsCloser,
          authorUrl: fixCharset(u.AuthorUrl),
          authorBio: fixCharset(u.AuthorBio),
          imageUrl: fixCharset(u.ImageUrl),
          jobTitle: fixCharset(u.JobTitle),
          phone: MASK_PII ? mask(u.Phone) : fixCharset(u.Phone),
          includeInStaffPages: !!u.IncludeInStaffPages,
          staffPageOrHomePage: fixCharset(u.StaffPageOrHomePage),
          active: !!u.Active,
          createdAt: u.CreatedAt ? new Date(u.CreatedAt) : new Date(),
        },
      });
    }
    userCount++;
  }
  console.log(`   ✓ ${userCount} users migrated (passwords → placeholder, must rehash)`);

  // ---- 11. Leads (tblLeads) ----
  console.log("11. Migrating Leads (tblLeads)...");
  const legacyLeads = await query<{
    LeadID: number;
    FirstName: string | null;
    LastName: string | null;
    Email: string | null;
    Phone: string | null;
    Status: string | null;
    Disposition: string | null;
    InitialDisposition: string | null;
    StatusDate: string | null;
    CSUserID: number | null;
    CloseUserID: number | null;
    CampaignID: number | null;
    ProductID: number | null;
    PublisherID: number | null;
    SubID: string | null;
    ClickID: string | null;
    LandingPageID: string | null;
    CreatedAt: string | null;
    // Clinical intake fields
    Insurance: string | null;
    Diagnosis: string | null;
    ChildAge: number | null;
    ProgramsInterested: string | null;
    Budget: string | null;
    TraumaHistory: string | null;
    CourtInvolvement: number;
  }>("SELECT * FROM tblLeads ORDER BY LeadID").catch(() => []);

  if (!DRY_RUN) {
    await prisma.toDo.deleteMany({ where: { lead: { tenantId: TENANT_ID } } });
    await prisma.leadNote.deleteMany({ where: { lead: { tenantId: TENANT_ID } } });
    await prisma.lead.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  let leadCount = 0;
  for (const l of legacyLeads) {
    const intake: Record<string, unknown> = {};
    if (l.Insurance) intake.insurance = fixCharset(l.Insurance);
    if (l.Diagnosis) intake.diagnosis = fixCharset(l.Diagnosis);
    if (l.ChildAge) intake.childAge = l.ChildAge;
    if (l.ProgramsInterested) intake.programs = fixCharset(l.ProgramsInterested)?.split(",");
    if (l.Budget) intake.budget = fixCharset(l.Budget);
    if (l.TraumaHistory) intake.traumaHistory = fixCharset(l.TraumaHistory);
    if (l.CourtInvolvement) intake.courtInvolvement = true;

    if (!DRY_RUN) {
      await prisma.lead.create({
        data: {
          id: legacyId("leads", l.LeadID),
          tenantId: TENANT_ID,
          firstName: MASK_PII ? mask(l.FirstName) : fixCharset(l.FirstName),
          lastName: MASK_PII ? mask(l.LastName) : fixCharset(l.LastName),
          email: MASK_PII ? mask(l.Email) : fixCharset(l.Email),
          phones: l.Phone ? [{ number: fixCharset(l.Phone), kind: "unknown" }] : [],
          status: fixCharset(l.Status) ?? "NEW",
          disposition: fixCharset(l.Disposition),
          initialDisposition: fixCharset(l.InitialDisposition),
          statusDate: l.StatusDate ? new Date(l.StatusDate) : null,
          assignedToId: l.CSUserID ? String(l.CSUserID) : null,
          closeUserId: l.CloseUserID ? String(l.CloseUserID) : null,
          campaignId: l.CampaignID ? String(l.CampaignID) : null,
          productId: l.ProductID ? String(l.ProductID) : null,
          publisherId: l.PublisherID ? String(l.PublisherID) : null,
          subId: fixCharset(l.SubID),
          clickId: fixCharset(l.ClickID),
          landingPageId: fixCharset(l.LandingPageID),
          intake,
          createdAt: l.CreatedAt ? new Date(l.CreatedAt) : new Date(),
        },
      });
    }
    leadCount++;
  }
  console.log(`   ✓ ${leadCount} leads migrated`);

  // ---- 12. LeadNotes (tblLeadNotes) ----
  console.log("12. Migrating LeadNotes...");
  const legacyNotes = await query<{
    NoteID: number;
    LeadID: number;
    Note: string;
    UserID: number | null;
    CreatedAt: string | null;
  }>("SELECT * FROM tblLeadNotes").catch(() => []);

  let noteCount = 0;
  for (const n of legacyNotes) {
    if (!DRY_RUN) {
      await prisma.leadNote.create({
        data: {
          id: legacyId("leadnotes", n.NoteID),
          leadId: legacyId("leads", n.LeadID),
          note: fixCharset(n.Note) ?? "",
          userId: n.UserID ? String(n.UserID) : null,
          createdAt: n.CreatedAt ? new Date(n.CreatedAt) : new Date(),
        },
      }).catch(() => {});
    }
    noteCount++;
  }
  console.log(`   ✓ ${noteCount} lead notes migrated`);

  // ---- 13. Pages (tblPages) ----
  console.log("13. Migrating Pages (tblPages)...");
  const legacyPages = await query<{
    PageID: number;
    Name: string;
    Slug: string | null;
    Title: string | null;
    Status: string | null;
    Layout: string | null;
    Data: string | null;
    UpdatedAt: string | null;
    CreatedAt: string | null;
  }>("SELECT * FROM tblPages").catch(() => []);

  if (!DRY_RUN) {
    await prisma.pageRevision.deleteMany({ where: { page: { tenantId: TENANT_ID } } });
    await prisma.page.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  let pageCount = 0;
  for (const p of legacyPages) {
    if (!DRY_RUN) {
      await prisma.page.create({
        data: {
          id: legacyId("pages", p.PageID),
          tenantId: TENANT_ID,
          name: fixCharset(p.Name) ?? p.Name,
          slug: fixCharset(p.Slug) ?? "",
          title: fixCharset(p.Title) ?? "",
          status: fixCharset(p.Status) ?? "DRAFT",
          layout: fixCharset(p.Layout),
          data: fixCharset(p.Data),
          createdAt: p.CreatedAt ? new Date(p.CreatedAt) : new Date(),
          updatedAt: p.UpdatedAt ? new Date(p.UpdatedAt) : new Date(),
        },
      });
    }
    pageCount++;
  }
  console.log(`   ✓ ${pageCount} pages migrated`);

  // ---- 14. Menu (tblMenuBuilder) ----
  console.log("14. Migrating Menus (tblMenuBuilder)...");
  const legacyMenus = await query<{
    MenuID: number;
    Name: string;
    Location: string | null;
  }>("SELECT * FROM tblMenuBuilder").catch(() => []);

  if (!DRY_RUN) {
    await prisma.menuItem.deleteMany({ where: { menu: { tenantId: TENANT_ID } } });
    await prisma.menu.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  let menuCount = 0;
  for (const m of legacyMenus) {
    if (!DRY_RUN) {
      await prisma.menu.create({
        data: {
          id: legacyId("menus", m.MenuID),
          tenantId: TENANT_ID,
          name: fixCharset(m.Name) ?? m.Name,
          location: (fixCharset(m.Location) as any) ?? "HEADER",
        },
      });
    }
    menuCount++;
  }
  console.log(`   ✓ ${menuCount} menus migrated`);

  // ---- 15. MenuItems (tblMenuItems) ----
  console.log("15. Migrating MenuItems...");
  const legacyMenuItems = await query<{
    MenuItemID: number;
    MenuID: number;
    ParentID: number | null;
    Label: string;
    Href: string;
    Order: number | null;
    Target: string | null;
    ItemType: string | null;
  }>("SELECT * FROM tblMenuItems").catch(() => []);

  let menuItemCount = 0;
  for (const mi of legacyMenuItems) {
    if (!DRY_RUN) {
      await prisma.menuItem.create({
        data: {
          id: legacyId("menuitems", mi.MenuItemID),
          menuId: legacyId("menus", mi.MenuID),
          parentId: mi.ParentID ? legacyId("menuitems", mi.ParentID) : null,
          label: fixCharset(mi.Label) ?? mi.Label,
          href: fixCharset(mi.Href) ?? mi.Href,
          order: mi.Order ?? 0,
          target: fixCharset(mi.Target),
          itemType: fixCharset(mi.ItemType) ?? "LINK",
        },
      }).catch(() => {});
    }
    menuItemCount++;
  }
  console.log(`   ✓ ${menuItemCount} menu items migrated`);

  // ---- 16. Company (tblSystem + tblCompany) ----
  console.log("16. Migrating Company (tblSystem + tblCompany)...");
  const legacyCompany = await query<{
    CompanyID: number;
    Name: string;
    Tagline: string | null;
    Description: string | null;
    BusinessHours: string | null;
    IndustryCategory: string | null;
    IndustrySubCategory: string | null;
    IndustrySubSubCategory: string | null;
    AudiencePersona1: string | null;
    AudiencePersona2: string | null;
    AudiencePersona3: string | null;
    LanguagesSpoken: string | null;
    AdditionalLanguage: string | null;
    GA4: string | null;
    GTM: string | null;
    FbPixel: string | null;
    SearchConsole: string | null;
    GscVerificationTag: string | null;
    BrandColor: string | null;
    LogoAssetId: string | null;
  }>("SELECT * FROM tblCompany LIMIT 1").catch(() => []);

  const legacySystem = await query<{
    Phone: string | null;
    PhoneLink: string | null;
    AdditionalPhone: string | null;
    Fax: string | null;
    Email: string | null;
    Address: string | null;
    City: string | null;
    State: string | null;
    Zip: string | null;
    Country: string | null;
    MapLinkUrl: string | null;
    MapEmbedUrl: string | null;
    Facebook: string | null;
    Twitter: string | null;
    YouTube: string | null;
    Instagram: string | null;
    LinkedIn: string | null;
    Pinterest: string | null;
  }>("SELECT * FROM tblSystem LIMIT 1").catch(() => []);

  const sys = legacySystem[0] ?? {};
  const co = legacyCompany[0] ?? {};

  if (!DRY_RUN) {
    await prisma.company.deleteMany({ where: { tenantId: TENANT_ID } });
    await prisma.company.create({
      data: {
        id: legacyId("company", 1),
        tenantId: TENANT_ID,
        name: fixCharset(co.Name) ?? TENANT_NAME,
        tagline: fixCharset(co.Tagline),
        description: fixCharset(co.Description),
        businessHours: {},
        industryCategory: fixCharset(co.IndustryCategory),
        industrySubCategory: fixCharset(co.IndustrySubCategory),
        industrySubSubCategory: fixCharset(co.IndustrySubSubCategory),
        audiencePersona1: fixCharset(co.AudiencePersona1),
        audiencePersona2: fixCharset(co.AudiencePersona2),
        audiencePersona3: fixCharset(co.AudiencePersona3),
        languagesSpoken: fixCharset(co.LanguagesSpoken),
        additionalLanguage: fixCharset(co.AdditionalLanguage),
        contactInfo: {
          phone: fixCharset((sys as any).Phone),
          phoneLink: fixCharset((sys as any).PhoneLink),
          additionalPhone: fixCharset((sys as any).AdditionalPhone),
          fax: fixCharset((sys as any).Fax),
          email: fixCharset((sys as any).Email),
          address: fixCharset((sys as any).Address),
          city: fixCharset((sys as any).City),
          state: fixCharset((sys as any).State),
          zip: fixCharset((sys as any).Zip),
          country: fixCharset((sys as any).Country),
          mapLinkUrl: fixCharset((sys as any).MapLinkUrl),
          mapEmbedUrl: fixCharset((sys as any).MapEmbedUrl),
        },
        ga4: fixCharset(co.GA4),
        gtm: fixCharset(co.GTM),
        fbPixel: fixCharset(co.FbPixel),
        searchConsole: fixCharset(co.SearchConsole),
        gscVerificationTag: fixCharset(co.GscVerificationTag),
        brandColor: fixCharset(co.BrandColor),
        socialMedia: {
          facebook: fixCharset((sys as any).Facebook),
          twitter: fixCharset((sys as any).Twitter),
          youtube: fixCharset((sys as any).YouTube),
          instagram: fixCharset((sys as any).Instagram),
          linkedin: fixCharset((sys as any).LinkedIn),
          pinterest: fixCharset((sys as any).Pinterest),
        },
      },
    });

    // Link tenant to company
    await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: { companyId: legacyId("company", 1) },
    });
  }
  console.log("   ✓ Company + System settings migrated");

  // ---- 17. Exclusions (if legacy tblExclusions exists) ----
  console.log("17. Migrating Exclusions...");
  const legacyExclusions = await query<{
    ExclusionID: number;
    CompanyName: string;
    DomainKey: string | null;
    Reason: string | null;
    IsActive: number;
  }>("SELECT * FROM tblExclusions").catch(() => []);

  if (!DRY_RUN) {
    await prisma.excludedCompany.deleteMany({ where: { tenantId: TENANT_ID } });
  }

  let exclusionCount = 0;
  for (const e of legacyExclusions) {
    if (!DRY_RUN) {
      await prisma.excludedCompany.create({
        data: {
          id: legacyId("exclusions", e.ExclusionID),
          tenantId: TENANT_ID,
          companyName: fixCharset(e.CompanyName) ?? e.CompanyName,
          domainKey: fixCharset(e.DomainKey),
          reason: fixCharset(e.Reason),
          isActive: !!e.IsActive,
        },
      });
    }
    exclusionCount++;
  }
  console.log(`   ✓ ${exclusionCount} exclusions migrated`);

  // ---- Done ----
  await src.end();
  if (!DRY_RUN) await prisma.$disconnect();

  console.log(`\n=== Migration complete ===`);
  console.log(`Tenant: ${TENANT_ID}`);
  console.log(`Regions: ${legacyRegions.length}`);
  console.log(`Categories: ${legacyCategories.length}`);
  console.log(`Listings: ${listingCount} (tier=FREE, no subscription)`);
  console.log(`Feeds: ${legacyFeeds.length} / Items: ${feedItemCount}`);
  console.log(`Articles: ${articleCount}`);
  console.log(`Topics: ${topicCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`Leads: ${leadCount}`);
  console.log(`Pages: ${pageCount}`);
  console.log(`Menus: ${menuCount} / Items: ${menuItemCount}`);
  console.log(`Exclusions: ${exclusionCount}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Run: npx tsx scripts/verify-migration.ts --tenant-id ${TENANT_ID}`);
  console.log(`  2. Force password resets for all users (legacy SHA1 → argon2 rehash)`);
  console.log(`  3. Verify PII masking if --mask-pii was used`);
}

migrate().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});

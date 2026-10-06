# GeoCategory & Programmatic Page Generation

> Audience: client / partner discussions. Covers what a GeoCategory is, exactly how many pages
> one creates, how it differs from article region variants, the Google duplicate-content question,
> and why this model differentiates the platform from conventional CMS/blog products.
>
> Code references are file paths in this repo so any engineer can verify each claim.

---

## 1. What is a GeoCategory?

A **GeoCategory** is a category landing page authored **once**, with localization tokens, then
rendered automatically **once per geography** (parent page → one page per state → one page per city).

The admin UI labels the four content blocks explicitly
(`apps/web/app/(admin)/admin/geo-categories/new/NewGeoCategoryForm.tsx:87-109`):

| Block | Serves |
|---|---|
| Category Parent Content | The `/g/{category}/` index page |
| State Page (Intro / Static) | `/g/{category}/{state-slug}/` pages |
| City Page (Intro / Static) | `/g/{category}/{city-slug}/` pages |
| Alternate Intros (per state + area) | Override the city intro for a state/area (`CategoryRegionContent`) |

**Legacy origin:** migrated from the original PHP platform's MySQL tables
(`scripts/migrate-legacy.ts:146-317`):

- `tblSearchCategoryParent` → `Category` (the GeoCategory itself, incl. `StateInit/StateDesc/CityInit/CityDesc`)
- `tblSearchCategoryRegionContent` → `CategoryRegionContent` (per state + areaPart overrides)
- `tblRegions` → `Region` (**665 rows** in the legacy dataset — `docs/migration-checklist.md:13`)

Conceptually it is a **write-once → render-everywhere** SEO page factory:

```
Authored once (4 text blocks + optional per-area overrides)
        │
        ▼
~region~ / {{region}} token substitution per geography
        │
        ▼
1 parent page + 1 page per region in the Region table
```

---

## 2. How many pages does ONE GeoCategory create?

### The multiplication rule

Page generation is a pure **Cartesian product of all categories × all regions**:

```ts
// apps/web/app/(site)/g/[category]/[region]/page.tsx:22-27
export async function generateStaticParams() {
  const categories = await repo.getCategories();
  const regions = await repo.getRegions();
  return categories.flatMap((c) => regions.map((r) => ({ category: c.slug, region: r.slug })));
}
```

**Generation** is the Cartesian product: `getRegions()` returns **every** region with no
per-category or per-content filter (`apps/web/lib/directory/prismaCatalog.ts`). The **sitemap is
now narrower than generation** — `apps/web/app/sitemap.ts` submits only regions that pass the
index gate (§4), so Google is pointed at pages that have earned indexing while every URL stays
live for humans, links, and paid traffic.

### The math

```
1 GeoCategory creates:
  1  parent page                 /g/{category}/
+ N  region pages                /g/{category}/{region-slug}/
+ K  pagination pages            /g/{category}/{region-slug}/page/2..K/   (10 listings/page)
+    legacy .html/.php 301 aliases for each (proxy.ts:15-51)

With legacy data: N = 665 regions  →  666 pages minimum per GeoCategory
```

### Important clarification for client discussions

**There is no "regions it was set to" setting on a GeoCategory.** The create/update server actions
(`apps/web/app/(admin)/admin/geo-categories/actions.ts:127,205`) and both admin forms contain **no
region picker**. The multiplier is *always* the full Region table size — it does not depend on any
configuration. Content is not independently written per region either; the same four blocks are
re-rendered with token substitution, plus optional per-state/area overrides.

> ⚠️ Terminology trap: "pick N regions → N pages" is true for **articles/content templates**
> (see §3), *not* for GeoCategories. Mixing the two up will misstate page counts to a client.

---

## 3. How articles differ: opt-in region variants

Articles (`ContentTemplate`) *do* have a per-entity region setting. The admin
**VariantPublisher** (`components/admin/VariantPublisher.tsx`) says: *"A variant is materialized
per selected region. Pick 1 or more — no cap."*

Publishing to N regions runs `publishVariants(templateId, regionIds)`
(`apps/web/lib/localization/variants.ts:44`), which creates **exactly N** stored `ContentVariant`
rows (`@@unique([templateId, regionId])`). The sitemap then emits per article
(`apps/web/app/sitemap.ts:71-97`):

```
/{slug}                        ← base page (1)
/{slug}?region=all             ← token-stripped original
/{slug}?region={region-slug}   ← × N, one per LIVE variant
```

**Article math: N selected regions → N extra URLs (+ the base article).** Only regions explicitly
published count (`variants: { where: { status: "LIVE" } }`, `sitemap.ts:31`).

### Side-by-side

| | GeoCategory | Article / Content template |
|---|---|---|
| Region selection | **None** — always all regions | **Explicit** — publish to chosen regions |
| Multiplier | `1 + N` (N = full Region table, 665 legacy) | `1 + N` (N = regions you selected) |
| Storage of variants | Rendered on read (ISR, `revalidate = 3600`) | Materialized rows, stored per region |
| Controlled by editor? | No — fixed by data model | Yes — deliberate per-publish choice |
| URLs | Path segments: `/g/{cat}/{region}/` | Query strings: `/{slug}?region={slug}` |

---

## 4. The Google duplicate-content question

**Short answer: no automatic penalty, but the current implementation carries real SEO risk that
should be disclosed and fixed before scaling.** Google does not penalize duplicate content in the
sense of de-ranking a site for it; it *canonicalizes* (picks one URL to show) and, for
doorway-style thin sprawl, may simply ignore the extras. The risk here is wasted crawl budget and
diluted ranking signals — not a manual penalty — **provided the pages are genuinely different**.

### Why the pages are usually *not* duplicates

Each region page is substantively distinct:

1. **Title & meta differ per page** — `generateMetadata` renders `{{in region}}` per region
   (`g/[category]/[region]/page.tsx:29-45`), e.g. *"Wilderness Therapy in Sacramento, CA"*.
2. **Body copy differs** — token substitution (`lib/localization/render.ts:60-95`) rewrites
   `{{region}}`, `{{in region}}`, `{{near region}}`… with the actual place name.
3. **The listing set differs** — each page shows only listings joined to that region via the
   `ListingRegion` m2m (3–5 nearby regions enforced per listing,
   `modules/listings/actions.ts:118-119`). A San Diego page and a Sacramento page show different
   companies. That is real, unique, user-valuable content — the classic legitimate
   **programmatic/local SEO** pattern (the same pattern directories like G2, Yelp, and Zillow use).

So Google sees unique title + unique intro copy + unique listing inventory per URL. That is
**not** duplicate content.

### Where the real risk is

| Risk | Status | Notes |
|---|---|---|
| **No canonical tags on `/g/*`** | ✅ **Fixed** | Every `/g/*` page now emits a self-referencing canonical (`lib/seo/geoCategorySeo.ts`); an admin-set Canonical URL overrides the **parent** page only — region pages always self-canonicalize (they are unique content) |
| **No JSON-LD on `/g/*`** | ✅ **Fixed** | `BreadcrumbList` on parent + region pages, `ItemList` (parent: state index; region page: city list) + admin-authored Schema-tab JSON-LD (`g/[category]/page.tsx`, `g/[category]/[region]/page.tsx`) |
| **No SEO controls on GeoCategory** | ✅ **Fixed** | GeoCategory new/edit forms now have the same **SEO / Advanced / Schema** tabs as the Page content type (`SeoFields`), stored on `Category` (migration `20261005000000_add_category_seo_fields`) and honored by all `/g/*` metadata: title, meta description, keywords, robots index/follow, OG image, canonical, JSON-LD. `seoTitle`/`metaDesc` support `{{region}}` tokens so 665 region pages keep unique titles |
| **Thin-content tail** | ✅ **Fixed (index gate)** | `lib/directory/indexGate.ts` implements THE rule: a region page is indexable iff it has **≥1 visible listing OR authored region content** (`custom1`/`custom2` or a matching `CategoryRegionContent` row — shared `stateInit`/`description` fallbacks never count). Non-qualifying pages get `noindex` in `generateMetadata`, drop out of the sitemap, and are unlinked from the parent/city indexes. Counts run through the same visibility gate + candidate query the pages render, so the gate can never disagree with what users see (cached1h, 2 queries per category — not 665) |
| **No FAQ/depth blocks on region pages** | ✅ **Done (Phase 2)** | `CategoryRegionContent.faq` (migration `20261006000000`) — all 36 category × region rows carry authored intros + 3 Q&A each; the page renders the matched set with `FAQPage` JSON-LD that mirrors the visible copy exactly (tokens localize per region) |
| **Listings absent from structured data; cards don't link to detail pages** | ✅ **Fixed** | Region pages emit an `ItemList` of the *visible* listings (post-visibility-gate, mirrors what renders); `ListingCard` titles link to `/listing/[slug]/` — internal link equity flows to detail pages (route now committed) |
| **Analytics/GSC not launch-ready** | ✅ **Ready (dev-inert)** | GA4 loader fixed (config existed without `gtag.js`), FB Pixel + `google-site-verification` meta added, all driven by Admin → My Company fields — renders nothing while unset; see launch-readiness table below |
| **Parent-index gating exists but generation doesn't** | ✅ **Aligned (deliberately)** | Link set === index set === sitemap set, all derived from the one gate. Generation still produces every URL on purpose: excluded pages stay browsable for humans/ads/shares and flip to indexable the moment listings or authored content land (one cached lookup). Only the *index* is curated, never the *site* |
| **Crawl budget** | ✅ **Reduced + 🔶 Monitor** | The sitemap now lists only gate-passing region URLs (parent stays at 0.8, qualifying regions at 0.6). Watch GSC coverage — see the Phase 3 checklist below |

### The verdict to repeat to a client

> These pages are **unique-content local SEO pages**, not duplicate copies — each has its own
> title, copy, and listing inventory. Google's concern is *thin, repetitive* pages, and our
> defense is genuine per-region content. Canonical tags, structured data, per-GeoCategory
> SEO/robots controls, and the **indexation gate** (only pages with listings or authored content
> enter Google's index, sitemap, and internal link graph) are all implemented — see the §4
> status table. What remains is editorial (Phase 2) and monitoring (Phase 3), below.

### Phase 2 — content that earns the index (editorial)

The gate decides *who enters*; content quality decides *who ranks*. Priority order:

1. **Regions that already have listings first** — they pass the gate automatically; add depth
   (authored intro via `custom1`/`CategoryRegionContent`, program counts, nearest-programs
   mileage, FAQ) to move from "indexable but thin" to "genuinely rankable".
2. **Then demand-driven picks** — search volume for `[category] + region` × business value
   decides the next regions to author. Never blanket-fill all 665.
3. **Hard editorial rule:** *never publish a page whose only differentiation from its parent is
   the place name.* A region that can't meet that bar (and has no listings) simply stays in the
   excluded tier — that is discipline, not loss.

### Phase 3 — monitoring loop (monthly)

Google Search Console checklist:

- **Page indexing → "Discovered – currently not indexed"** should stay flat/small. A climbing
  ratio means either the gate is leaking or indexed pages are too thin.
- **Indexed pages count** should track the gate-passing set (sitemap size), not the generated set.
- **Impressions on region pages** — if an *excluded* region ever shows impressions elsewhere
  (or a hand-picked URL performs), promote it into the Phase 2 fill list: demand is proven.
- **Manual actions / spam policies**: expected at zero (we exclude our own thin tail), verify
  quarterly.
- Listings growth is the flywheel: a new sponsor in a region → cached count refreshes → page
  flips to indexable → sitemap picks it up on next revalidate (`1h`). No manual SEO step.

#### Phase 2 execution log (batches 1–2 — done)

| Action | Script / where | Detail |
|---|---|---|
| 10 sample listings + region/category joins | `prisma/seed-sample-listings.mts` | Fictional programs (example.com / 555-01xx), `LIVE`, tiers PREMIUM/STANDARD/FREE-with-grace. Idempotent: existing slugs skipped. Region coverage: CA=6, SD=5, FL=6, NY=6, TX=5, VA=6 — **every region now has listings**, so all 6 pass the gate listing-earned as well as content-earned |
| `custom1` placeholder upgrades ×4 | `prisma/seed-region-content.mts` | TX/FL/NY/VAs shared the identical "…find care close to home." template → replaced with real region intros (guarded overwrite: only fires while the row still holds the exact placeholder, hand-edited copy is never clobbered). CA and San Diego copy left untouched (not template text) |
| Category-specific intros ×36 | `prisma/seed-region-content.mts` | **All 6 categories** × 6 scopes ({CA, TX, FL, NY, VA} `areaPart: ALL` + San Diego `areaPart: SOUTHERN`) — distinct regional angle per scope, no place-name token swaps. Idempotent upsert on the `(categoryId, state, areaPart)` key |
| FAQ blocks ×36 sets (3 Q&A each) | `CategoryRegionContent.faq` + `prisma/seed-region-content.mts` | New JSON column (migration `20261006000000_add_category_region_faq`). Token-rendered per region; the region page renders the matched set with matching `FAQPage` JSON-LD (structured data mirrors visible copy — never one without the other). Stored per row so a single scope can be specialized later without touching its siblings |

- **Rerun order after a destructive `db:seed`:** `db:seed` → `seed-sample-listings.mts` →
  `seed-region-content.mts` (both are idempotent and safe to re-run at any time).
- **Next editorial batch (priority order):** per-scope FAQ specialization (override one
  category × region row where GSC shows impressions), nearest-programs mileage / program
  counts, then demand-driven expansion beyond the 6 live regions. Same script — extend
  `CONTENT`.

#### Launch-readiness: analytics & Search Console (dev-inert)

Configured in **Admin → My Company**; every value renders only when set, so development
stays clean and flipping these on at launch requires no code changes:

| Field | Renders | Status |
|---|---|---|
| `gscVerificationTag` | `<meta name="google-site-verification">` (React 19 hoists to `<head>`) | ✅ wired + verified live (set → meta appeared → reverted) |
| `ga4` | `gtag.js` loader **+** `gtag('config')` | ✅ fixed — the config existed but the loader script was missing, so GA4 could never fire; now complete |
| `gtm` | GTM container snippet | ✅ already wired |
| `fbPixel` | Meta pixel (`fbevents.js` + `PageView`) | ✅ wired (was fetched but never rendered) |

At launch: set these four fields, flip `searchEngineVisibility`, set production `SITE_URL`
(both env files currently pin `http://localhost:3000` — canonicals/sitemap would otherwise
self-reference localhost), verify the GSC property, submit the sitemap.

#### Phase 3 status

- **Done (code-side):** gate consistency is test-enforced (`indexGate.test.ts`,
  `geoCategorySeo.test.ts`, `geoCategoryPageWiring.test.ts`) and was verified live: sitemap
  serves exactly the gate-passing set (42 `/g/` URLs = 6 parents + 6×6 regions) and region
  pages emit the gate's `robots` directive.
- **Needs account access (owner):** verify the property in Google Search Console, then run the
  monthly checklist above. GSC cannot be automated from this repo without API credentials.
- **Before launch (owner):** flip `theme.readingSettings.searchEngineVisibility` from `hidden`
  — `app/layout.tsx:78` injects a raw `noindex, nofollow` that currently overrides the
  gate on every page (likely intentional while in dev).

---

## 5. Why this is unique vs. conventional CMS/blog products

Standard CMS platforms (WordPress + plugins, Webflow, Ghost, Contentful) give you **one URL per
article/page**. Scaling to "one page per category × city" requires either manually creating
thousands of pages, a heavy programmatic-SEO plugin (WP GeoDir, custom theme code), or an
external landing-page service (Yext, Birdeye, Uberall). This platform bakes it into the core:

| Capability | Typical CMS/blog | This platform |
|---|---|---|
| Page model | 1 page = 1 URL, hand-authored | 1 authoring unit → `1 + N` generated URLs |
| Regional copy | Manual duplication or no localization | Write-once with `{{region}}` tokens, rendered per geography (`lib/localization/render.ts`) |
| Region-aware articles | Not supported | Opt-in variant materialization, one stored copy per selected region (`variants.ts:44`) |
| Listing inventory per geo | Manual | Automatic — `ListingCategory` × `ListingRegion` join decides what each page shows |
| Geo content overrides | N/A | Per state + `areaPart` (N/S/E/W/C) alternate intros (`CategoryRegionContent`) |
| Consistency at scale | Drift — every global edit touches thousands of pages | One edit propagates to all 666+ pages on next ISR revalidate (`revalidate = 3600`) |
| Compliance/quality gates | Plugin-dependent | Single visibility gate: suppressed/unpaid/expired listings never render (`lib/directory/visibility.ts`) |
| Migration path | Rebuild | Legacy `tblRegions`/`tblSearchCategory*` imported 1:1 (`scripts/migrate-legacy.ts`) |

**In one sentence for a partner:** *most CMS products make you choose between writing content and
ranking locally at scale; this system is a programmable-SEO engine fused with a paid directory —
one editorial action fans out into hundreds of genuinely unique, monetizable, geo-targeted pages,
with the commercial rules (paid tiers, suppression, lead capture) enforced at the data layer rather
than bolted on.*

### Honest counterpoint (keep this ready)

The same machinery is what makes **doorway-page** scrutiny possible: if region pages were
near-identical boilerplate, Google would discount them. The moat is only real while the content
stays genuinely differentiated (listings + overrides + tokens). That's why §4's recommendations
are treated as launch gates, not nice-to-haves — canonicals, structured data, SEO controls, and
the indexation gate (excluded regions never enter Google's index) are all implemented; the
remaining gates are editorial (Phase 2 content depth) and operational (Phase 3 GSC monitoring).

---

## 6. One-line reference: page-count formulas

```
GeoCategory  : 1 + R + Σ(pagination)      R = ALL regions (665 legacy), not configurable
Article      : 1 + N                      N = regions selected at publish (LIVE variants only)
Legacy alias : × 2 (.html/.php) → 301 to canonical (proxy.ts:15-51)
```

---

## 7. Geo Category Custom Single Page (template builder)

The **parent page** (`/g/[category]/`) can now be composed with the same visual page-builder
stack that powers the blog templates — admins pick **Visual Display** (live preview) or
**Structure Display** (block tree + settings), drag blocks, and autosave.

- **Admin entry:** Geo-Targeting → *Geo Category Custom Single Page* (`/admin/geo-category-template`).
  Two default variations seed on first visit: **Fullwidth — Default** (`isDefault`) and
  **Right Sidebar — Default**; any number of custom templates can be created per layout tag.
- **Assignment:** each GeoCategory edit screen has a *Single Page Template* card
  (`GeoTemplateAssignmentCard`). Choosing a template writes a `GeoCategoryTemplateAssignment`
  row (`pageType = "geoCategory"`, `priority = 10`). Resolution order at render time:
  per-category assignment → default template → **null → the original legacy layout** (nothing
  changes for categories without a template).
- **Geo blocks:** `geoHero`, `geoContent`, `geoRegionNav`, `geoListings`, `geoFaq`, `geoSidebar`
  (listings / state links / FAQ / custom-HTML widgets), plus the shared block library
  (rows, sections, text, image, CTA, …). A bindings editor wires block fields to live data
  (`category.*`, `region.*`, `heroImage`, `categoryUrl`, …) with rich-text sanitization and
  unsafe-URL rejection.
- **Live data on the parent page:** the gated state index (§4 gate), listings through the same
  visibility pipeline every `/g/` tier uses (`lib/directory/listingQuery.ts` →
  `filterVisibleListings` → tier sort), FAQ from `CategoryRegionContent` rows (explicit
  `state = "ALL"` rows win; otherwise all rows aggregated and deduped), and the PRIMARY
  category image. SEO output (breadcrumb/ItemList/custom JSON-LD, metadata) is unchanged and
  renders for both template and legacy layouts.
- **Schema:** `20261006120000_add_geo_category_templates` creates `GeoCategoryTemplate`,
  `GeoCategoryTemplateRevision` (30-snapshot version history with restore), and
  `GeoCategoryTemplateAssignment`. Admin actions are permission-gated to the `categories`
  section and logged under `GEO_CATEGORY_TEMPLATE_*` audit actions.

**v1 scope:** parent pages only — region/state/city pages keep their current design. Listing
cards deep-link to `/listing/[slug]/` (arrives with the directory listing route).

---

*Related: `docs/system-overview.md` (full platform documentation), `docs/cutover-runbook.md`
(legacy URL parity), `docs/migration-checklist.md` (data migration status).*

# Canopy V2 — System Overview

> Full documentation of how the platform works, as implemented in this repository.
> Companion pieces: `geocategory-and-page-generation.md` (page multiplication + SEO analysis),
> `migration-checklist.md`, `cutover-runbook.md`, `ADMIN-CONFIG-GUIDE.md`.
>
> Every claim below carries a `file:line` reference so it can be re-verified.

---

## 1. What the product is

A **paid SEO directory + lead-generation + CRM + subscription-billing platform** for the Christian
behavioral-health market (`README.md:5-8`):

- Searchable company **listings** sold as subscriptions (Free / Standard / Premium tiers).
- **Geo-targeted SEO pages**: category × state × city pages generated from one authored unit.
- **Localization engine**: write content once with `{{region}}` tokens → render/materialize per region.
- **Admin opt-out suppression**: certain companies never render anywhere.
- **Clinical-intake lead pipeline**, recurring billing (Stripe + PayPal + Square), feeds, CMS.

It is the modernization of the legacy **Canopy / MasterNet** PHP platform. Legacy knowledge enters
this repo through the MySQL→Postgres migration scripts, `docs/`, and section citations
(§4.x / §6.x of the original `../canopy-architecture.md` design authority — not in this repo).

---

## 2. Stack (as installed — note `README.md` is aspirational in places)

| Layer | Actual in repo | README claims |
|---|---|---|
| Framework | **Next.js 16.3.5** App Router + **React 19.2.8**, strict TS | "Next.js 15" |
| Styling | Tailwind CSS v4 + shadcn/ui | same |
| Data | PostgreSQL 16 + **Prisma 6** (`packages/db`, 88 models) | same |
| Cache / Jobs | Redis (Upstash) + **Inngest** (5 functions) | same |
| Payments | **Stripe ^22** + PayPal + Square | "Stripe (+Connect)" |
| Email | Resend + React Email (fails soft when key unset: `lib/email/send.ts:14-17`) | same |
| Auth | **Custom HMAC cookie + scrypt** (`lib/session-token.ts`, `lib/passwords.ts`) | "Auth.js" — *not installed* |
| APIs | **44 server-action modules + 30 REST route handlers** | "tRPC" — *not installed* |
| Search | **Admin-only Prisma `contains`** — no FTS, no public `/search` | "Postgres FTS" |
| Observability | Structured logs; OTel/Sentry per README (not verified in app code) | same |

Two routes referenced in README/docs **do not exist**: `/search` and `/feeds` (feeds are
ingestion-only). One broken remnant imports `next-auth`
(`apps/web/app/api/checkout/upgrade/route.ts:2-3`) — that route throws at runtime.

---

## 3. Repository layout

```
canopy-v2/
├── apps/web/                  # Next.js app
│   ├── app/(site)/            # public SEO pages
│   ├── app/(admin)/           # back office (~97 pages)
│   ├── app/api/               # 30 REST handlers (webhooks, inngest, uploads, grids…)
│   ├── components/            # UI (RegionListings, ListingCard, admin/*)
│   ├── lib/                   # localization, directory, billing, email, session
│   ├── modules/               # feature slices (auth, leads, listings, geo, shared)
│   └── proxy.ts               # edge: legacy 301s + admin guard (middleware)
├── packages/db/               # prisma/schema.prisma + migrations + seeds
├── packages/jobs/             # Inngest functions (variant publish, feed sync, dunning…)
├── packages/ui/               # shared shadcn-based components
├── scripts/                   # migrate-legacy.ts, verify-migration.ts, verify:*
└── docs/                      # this documentation set
```

---

## 4. Data model (grouped, `packages/db/prisma/schema.prisma`)

Every table carries `tenantId` (multi-tenancy readiness); runtime uses
`TENANT_ID = env.CANOPY_TENANT_ID ?? "tenant-masternet"` (`lib/directory/prismaCatalog.ts`).

| Domain | Key models | Purpose |
|---|---|---|
| **Tenancy/identity** | `Tenant`, `User`, `Role` (SUPER_ADMIN…SALES_REP), `UserRole`, `LoginAttempt` | Accounts + RBAC |
| **Geo taxonomy** | `Region` (665 legacy rows, `areaPart` N/S/E/W/C), `Category` (a GeoCategory: `stateInit/stateDesc/cityInit/cityDesc`, `altIntros`), `CategoryRegionContent`, `CategoryRegionFeed`, `CategoryImage`, `Section` | The geo/content universe |
| **Listings** | `Listing` (~40 cols incl. `freeGraceUntil/paymentGraceUntil`), `ListingTier`, `ListingCategory`, `ListingRegion` (m2m), `ExcludedCompany`, `ListingSubscription`, `Review`, `ListingLead`, `FeaturedPlacement*` | Directory inventory + commercial state |
| **Content/localization** | `ContentTemplate` (article), `ContentVariant` (`@@unique([templateId, regionId])`), `Page`, `HeaderFooter`, `PageLayout`, `BlogTemplate`, `Menu`, `Widget`, `Snippet`, `Asset` | CMS + variant materialization |
| **Feeds** | `Feed`, `FeedItem`, `SearchArticle` | RSS ingestion → curated public articles |
| **CRM** | `Lead` (+`LeadNote`, `ToDo`), `Client`, `Invoice`, `AuditLog`, `WebhookEndpoint/Delivery`, `LeadCredit` | Sales pipeline + audit |
| **Commerce** | `Product`, `Cart/Order`, `Coupon`, `TaxRate`, `PaymentGateway`, `Merchant` | Storefront + gateway config |

---

## 5. Public site routes (`apps/web/app/(site)/`)

| Route | Revalidate | What it does |
|---|---|---|
| `/` | 0 | Homepage from `Page.isHomepage`; canonical only if set; JSON-LD (`page.tsx:41,62`) |
| `/{slug}` | 0 | Root resolver: **product → page → single post** (`[slug]/page.tsx:15`); canonical + JSON-LD |
| `/article/{slug}` | — | **308 → `/{slug}`** (articles consolidated at root) |
| `/g/{category}` | **3600 (ISR)** | GeoCategory parent page: token-stripped intro + state index (only states passing the index gate: `lib/directory/indexGate.ts`) |
| `/g/{category}/{region}` | **3600** | State/city page: filter bar + region listings (`g/[category]/[region]/page.tsx`) |
| `/g/{category}/{region}/page/{n}` | **3600** | Pagination, 10 listings/page (`listingQuery.ts:14`) |
| `/listing/{slug}` | 0 | Company detail + LocalBusiness JSON-LD; **no visibility gate** (see §12); lead form has no handler (`:462`) |
| `/blog` | 0 | Blog template + 3 LIVE posts |
| `/apply` | 0 | Listing application → creates `Listing` (PENDING_REVIEW) → Stripe Checkout; tiers $97/$197 (`apply/actions.ts:16`) |
| `/checkout` (+success/cancel/paypal/square return) | 0 | Multi-gateway checkout (~700 lines, coupons, stock reserve, order emails) |
| `/cart`, `/orders`, `/wishlist`, `/upgrade`, `/claim/{slug}` | 0 | Session cart, order history, tier upgrade (⚠ posts to broken route), claim flow |

**Edge (`proxy.ts`)**: legacy URL 301s limited to `/g/*` and `/admin/*`
(`proxy.ts:84-86`) — strips `.html/.php`, enforces trailing slash, maps `/g/index.php` → `/g/`;
region slugs are **case-sensitive** (mixed case is canonical). `adminGuard` 302s to
`/admin/login` on missing/invalid session cookie (`proxy.ts:53-70`).

---

## 6. The localization engine (core differentiator)

**Rule:** *content is authored once with tokens; variants are materialized on publish; pages render
statically via ISR* (`README.md:48-50`).

1. **Tokens** — `lib/localization/render.ts:60-95` substitutes (longest-first):
   `{{region}}`, `{{in region}}`, `{{near region}}`, `{{around region}}`, `{{of region}}`,
   `{{from region}}`, `{{in the region area}}`, `{{region2inject}}`, `{{catname}}`, `{{subcat}}`.
   Example: `"help {{in region}}"` → `"help in Sacramento, CA"`. The parent/ALL page strips tokens
   (legacy `~region~` compatibility behavior).
2. **Category copy resolution** — `lib/directory/resolveContent.ts:1-12` (legacy §6.5e):
   - State page: `CategoryRegionContent(state,"ALL") → region.custom1 → region.custom2 → category.stateInit → category.description`
   - City page: `CategoryRegionContent(state,areaPart) → category.cityInit → category.description`
3. **Articles: materialize on publish** — `lib/localization/variants.ts:44 publishVariants()`
   loops the selected regions and upserts one `ContentVariant` per region (idempotent, skips
   unchanged text). Runs inline (`admin/content/actions.ts:43,69`) or via the Inngest
   `variant-publish` job for large sets (`packages/jobs/src/variantPublish.ts:21`).
4. **Serving an article** — priority chain in `lib/localization/postRegion.ts:39-70`:
   explicit `?region=` → `?region=all` → geo state from Vercel headers → first published variant →
   general (token-stripped). Unknown slugs fall through rather than render raw tokens.

---

## 7. The directory: visibility gate & paid tiers

**The single enforcement point** is `lib/directory/visibility.ts` (header comment: *suppressed,
unpaid, suspended and expired listings must never render anywhere*).

- Tiers: `SUPPRESSED | FREE | STANDARD | PREMIUM` (`visibility.ts:13`); first rule:
  `if (listing.tier === "SUPPRESSED") return false` (`:50`), grace windows via
  `freeGraceUntil` / `paymentGraceUntil`.
- Sorting: `TIER_RANK {PREMIUM:0, STANDARD:1, FREE:2}` — Premium first
  (`listingQuery.ts:16-20`).
- Listing lifecycle: approve → `LIVE` + 90-day free grace (`modules/listings/actions.ts:264-275`);
  duplicate detection + 3–5 nearby-region requirement (`:118,321`).
- Suppression list UI: `/admin/exclusions` (`admin/exclusions/page.tsx:16-18`).

**⚠ Current reach:** the gate is called from exactly one place — `components/RegionListings.tsx:33`
(i.e. the `/g/*` region pages). `/listing/{slug}` renders any slug and only noindexes non-LIVE
(`listing/[slug]/page.tsx:70,97`). The cutover runbook treats any suppressed listing rendering as
a P1 bug (`docs/cutover-runbook.md:60`).

---

## 8. Admin back office (`apps/web/app/(admin)/`)

Nav groups (`admin/layout.tsx:27`): **Content** (Articles, Topics, SubTopics, Sections, Pages,
Snippets, Menus, Blog/Content templates, Page Layout) · **Geo-Targeting** (GeoCategory Pages, Geo
Images, Regions) · **Directory** (Listings, Analytics, Bulk Edit, Featured Placements, Exclusions,
Verification, Reviews) · **Ads&Listing** (Widgets, Header/Footer, Style Guide) · **Sales&Billing**
(Leads, Clients, Orders, Invoices, Coupons, Tax, Merchants, Reports, Gateways, Webhooks) ·
**Admin** (Users, My Company) · **System Tools** (Media, Assets, Fonts, Reading, Feed, Audit).

**Pattern (no tRPC):** `"use server"` `actions.ts` → `requireSection(section)` → Prisma mutation →
`logAudit(...)` → `revalidatePath(...)` → optional `redirect(...)`, plus `xForm(formData)` wrappers
for `<form action>` (`modules/listings/actions.ts:311-318`; reference pattern
`admin/style-guide/actions.ts`). Server-side guards stack: `requireSection` (pages/actions) →
`getApiUser`/`canAccessSection` (API) → `proxy.ts` cookie check (edge, coarse).

---

## 9. CRM, billing, jobs

**Leads:** statuses `NEW | OPEN | CLOSED | ARCHIVED` (`modules/leads/types.ts:8`), dispositions
(`admin/leads/[id]/page.tsx:28-37`), search/list via `modules/leads/queries.ts`.
**Gap:** `prisma.lead.create` is never called in app code — only the legacy migration creates
leads (`scripts/migrate-legacy.ts:828`). The listing lead form is unhandled; `/api/claim` writes
`ListingLead` (`app/api/claim/route.ts:53`). Outbound webhook `app/api/webhooks/lead/route.ts`
verifies HMAC, consumes `LeadCredit` quota, records `WebhookDelivery` — but **nothing ever dispatches
the outbound request** (record-only today).

**Billing:** gateway config read from DB first, env fallback (`lib/billing/checkout.ts:37-44`).
Stripe webhook map (`app/api/webhooks/stripe/route.ts:1-13,21`):

| Event | Effect |
|---|---|
| `checkout.session.completed` | listing → `LIVE` + `ListingSubscription` + audit |
| `invoice.payment_failed` | → `SUSPENDED` + 7-day `paymentGraceUntil` (dunning) |
| `invoice.payment_succeeded` | reinstated `LIVE` |
| `subscription.deleted` | → `SUSPENDED` |
| `charge.refunded` / `dispute.created` | `Invoice.REFUNDED` / `CHARGEDBACK` + audit |

PayPal + Square webhooks verify signatures before mutating (`api/webhooks/{paypal,square}/route.ts`).

**Inngest jobs** (`packages/jobs/src/index.ts`, served at `app/api/inngest/route.ts`):

| id | Trigger | Does |
|---|---|---|
| `variant-publish` | event | Materialize article region variants async |
| `feed-sync` | cron `0 */6 * * *` + event | Sync all RSS feeds |
| `feed-sync-one` | event | Sync single feed |
| `dunning` | cron hourly + event | SUSPENDED past grace → EXPIRED |
| `abandoned-orders` | cron `*/5 * * * *` | Abandoned-cart sweep (60-min age gate) |

---

## 10. Feeds (ingestion only — no public `/feeds`)

RSS/Atom parse (`lib/directory/feedParser.ts`, `fingerprintOf = sha1(title|url|date)` idempotency)
→ `syncFeed()` upserts `FeedItem` (15s timeout; second sync creates zero rows — proven by
`feedSync.integration.test.ts:27-30`) → admin curation at `/admin/feeds`
(`approveFeedItem` → `SearchArticle`, `admin/feeds/actions.ts:80-87`) → approved items surface
indirectly through page-builder grid APIs (`app/api/content-grid/route.ts:29`).

---

## 11. Auth, RBAC, SEO machinery, search, tests

**Auth/RBAC:** custom, zero native deps (`HANDOFF_PART_B.md:21-22`). Cookie `canopy_session`,
12h TTL, HMAC-SHA256 via Web Crypto, `SESSION_SECRET` required in prod (fails closed)
(`lib/session-token.ts`); passwords `crypto.scrypt` (`lib/passwords.ts`); login throttled
5 attempts/15 min (`admin/login/actions.ts`); RBAC map `SECTION_ROLES` + `canAccessSection()`
(`modules/auth/permissions.ts:10,46`) — unknown sections default to **denied unless SUPER_ADMIN**.

**SEO:**
- JSON-LD: home (`page.tsx:62`), root resolver product/page (`[slug]/page.tsx:323,349`), listing
  LocalBusiness+AggregateRating (`listing/[slug]/page.tsx:110,163`), posts (`SinglePost.tsx:267`).
- Canonicals: every `/g/*` page self-canonicalizes; an admin Canonical URL overrides the
  GeoCategory **parent** page only (`lib/seo/geoCategorySeo.ts`). Other CMS pages canonicalize
  only when a DB `canonicalUrl` column is set.
- `/g/*` metadata (title, description, keywords, robots, OG) is driven by the GeoCategory's
  **SEO / Advanced / Schema** fields (same `SeoFields` editor as the Page content type);
  `seoTitle`/`metaDesc` accept `{{region}}` tokens and render per region.
- `/g/*` JSON-LD: `BreadcrumbList` + `ItemList` (state index / city list) + admin Schema-tab
  JSON-LD, rendered server-side in the page components.
- **Indexation gate** (`lib/directory/indexGate.ts`): a region page enters Google's index,
  the sitemap, and the internal link graph iff it has **≥1 visible listing OR authored region
  content** (shared tokenized fallbacks never count). Non-qualifying region + pagination pages
  emit `noindex`; counts reuse the same visibility-gated candidate query the pages render and
  are cached 1h per category (2 queries, not 665). Link set === index set === sitemap set;
  excluded URLs stay generated and browsable for humans.
- `robots.ts`: allow-all, disallows `/admin /api /checkout /cart /wishlist`; per-page
  `robots.index` gates on `status === "LIVE"`. Reading-setting
  `searchEngineVisibility` is stored but **not wired** into `robots.ts`.
- Sitemap (`app/sitemap.ts`): home + category + **category×region (gate-filtered: only
  indexable regions)** + products + LIVE articles **with region variants**.
  **No `/listing/*` URLs.**
- Internal links: breadcrumb + `RegionListings` cards; listing cards link **externally** to the
  company website only (`ListingCard.tsx:42-43`) — listing detail pages are effectively orphaned.

**Search:** public search does not exist (no route, no FTS). Admin lists use Prisma
`contains`/`mode:"insensitive"` (leads, clients, users); several admin lists filter in-memory.
`RegionFilterBar` is filter-only (sort/tier/rating), no text query.

**Tests/scripts:** vitest (46 test files; DB integration gated behind `CANOPY_INTEGRATION=1`;
Stripe test suite self-skips without test keys); Playwright configured but
`@playwright/test` not installed. CI (`.github/workflows/ci.yml`) runs typecheck/lint/test/build
each with `|| true` → **non-blocking**. Scripts: `migrate:legacy` (mysql2→pg, `--dry-run`,
`--mask-pii`), `migrate:verify` (row-count parity), `verify:{all,stripe,paypal,square}`.

---

## 12. Known gaps (engineering follow-ups, not product design)

Recorded here so client-facing claims stay honest. Full detail in the referenced files.

1. **`/g/*` SEO hardening**: canonicals, JSON-LD, per-GeoCategory SEO/robots controls, and the
   **indexation gate** (noindex + sitemap + link filtering for regions without listings or
   authored content) are **implemented** (see `geocategory-and-page-generation.md` §4 status
   table). Remaining are non-engineering gates: Phase 2 content depth for priority regions
   (editorial) and the Phase 3 monthly GSC monitoring checklist.
2. **Visibility gate reach**: enforced on region pages only; `/listing/{slug}` renders any slug.
3. **Broken route**: `api/checkout/upgrade/route.ts` imports non-existent `next-auth`.
4. **Dead surfaces**: listing lead form has no handler; listing cards never link to `/listing/{slug}`;
   legacy `/search` + `/feeds` 404 (not in `proxy.ts` matcher despite `cutover-runbook.md:24`).
5. **Leads**: app never creates `Lead` rows; outbound webhooks record but never dispatch.
6. **Unwired settings**: `searchEngineVisibility` → robots; `feedsPerPage`/`feedFormat`/`SEARCH_TOP`.
7. **CI non-blocking** (`|| true`) and Playwright dependency missing.
8. **Docs drift**: `README.md` stack (Auth.js/tRPC/FTS/Next 15), `ADMIN-CONFIG-GUIDE.md:151-154`
   Inngest function names, and `cutover-runbook.md:24` proxy claims don't match code.

---

*Last verified against the repository: October 2026. Re-verify `file:line` references after
large refactors.*

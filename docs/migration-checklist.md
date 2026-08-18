# Migration Checklist → Canopy V2 (PostgreSQL)

**Source of truth**: `../canopy-architecture.md` (§6.4 phases, §7 data dictionary).
**Data source**: `masternet.sql` is the **newest sample tenant** (fresh-site snapshot, Aug 2024) and the
schema reference. Production live data lives in the live client databases — export per tenant, per
schema, and load into `canopy-v2` tenants. The migration scripts must be **schema-driven and
tenant-repeatable**, never hardcoded to the sample rows.

## Phase 0 — Data pipeline (scripted, repeatable)

- [ ] Use `masternet.sql` to bootstrap a **staging reference DB** (schema parity checks only)
- [ ] Obtain production exports: one `mysqldump` per live client site (same `tbl*` schema, real rows)
- [ ] Write one migration script (Node: mysql2 → pg) that takes a dump file + tenant target as input
- [ ] Load each production tenant → `Tenant` row + its data (the sample site becomes one more tenant)
- [ ] Charset cleanup: latin1 → utf8mb4 (legacy tables are mixed)
- [ ] Map `tblRegions` (665) → `Region`; generate `slug` from legacy `DomainKey`
- [ ] Map `tblSearchCategory*` hierarchy → `Category` (parent/sub/topic groups)
- [ ] Map `tblSearchCategoryRegionContent/Feeds` → `CategoryRegionContent` / `CategoryRegionFeed`
- [ ] Map `tblSearchListing*` (incl. staff/credentials/insurance/testimonials) → `Listing` + m2m
- [ ] Set `Listing.tier = FREE` (legacy rows), `ListingSubscription` = null (they owe fees)
- [ ] Copy `tblSearchArticles`, `tblFeeds`/`tblFeedListings`, `tblSearchTopics`
- [ ] Map `tblLeads` (real production rows incl. clinical intake), `tblUsers` (argon2 rehash + reset flow)
- [ ] `tblPages`, `tblMenuBuilder`, `tblSystem`, `tblCompany` → `Page`, nav config, settings, Company
- [ ] Defer: billing tables (`tblClients/Invoices/Campaigns/Merchants`) until Phase 3 — snapshot only
- [ ] Guardrails: never load production PII into local dev; use masked fixtures per environment
- [ ] Verify: per-tenant row-count parity report; write a `scripts/verify-migration.ts`

## Phase 1 — Localization engine + public SEO site

- [x] Token renderer (`lib/localization/render.ts`) + vitest suites for all tokens & ALL-strip behavior
- [x] Region picker + variant preview + publish job (Inngest) — §6.5b (`/admin/content`, `packages/jobs/src/variantPublish.ts`, `/api/inngest`)
- [x] `/g/[category]/[region]` SSG/ISR pages + `app/sitemap.ts` + 301 handling (legacy `/g/` scheme — `proxy.ts`: `.html/.php` strip, trailing-slash canonical; `trailingSlash: true`)
- [x] Visibility gate `getVisibleListings()` + suppression filter — §6.7.3.1
- [x] Prisma-backed catalog repo verified against seeded Postgres (`CATALOG_REPO=prisma`; integration tests gated behind `CANOPY_INTEGRATION=1`)

## Phase 2 — Listings admin + paid directory

- [x] Exclusions admin (`/admin/exclusions`) + audit logging (`lib/audit.ts`; actions SUPPRESS_ADD/REMOVE, LISTING_* → AuditLog)
- [x] Listing CRUD, review queue, Nearby-Areas region picker (`/admin/listings` + `new/` + `[id]/edit/`, `components/admin/ListingForm.tsx`; approve→LIVE + 90-day FREE grace, reject→DRAFT)
- [x] `/apply` public flow + Stripe Checkout (setup fee + subscription) — §6.7.3.2 (`lib/billing/checkout.ts`; `/api/webhooks/stripe`: checkout.session.completed → LIVE + ListingSubscription, invoice.payment_failed → SUSPENDED + 7-day grace, customer.subscription.deleted → SUSPENDED; STRIPE_* + ADMIN_SECRET env placeholders) + minimal admin auth (`lib/admin-auth.ts`, HMAC cookie, proxy guard)

### Phase 2 — deferred Stripe verification (TEST keys; do before production cutover)

- [ ] Set `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to **test-mode** keys in `apps/web/.env.local`
- [ ] Set `STRIPE_PRICE_STANDARD` / `STRIPE_PRICE_PREMIUM` / `STRIPE_SETUP_FEE_ID` to test-mode price IDs (or unset → getPriceId falls back)
- [ ] Run `stripe listen --forward-to localhost:3111/api/webhooks/stripe` and set `STRIPE_WEBHOOK_SECRET` to the test webhook signing secret
- [ ] E2E: `/apply` → Checkout test card 4242 → redirect `/checkout/success` → verify listing flips LIVE + `ListingSubscription` row (LIVE, currentPeriodEnd set) + AuditLog LISTING_APPROVE
- [ ] E2E: cancel checkout → `/checkout/cancel` → listing stays PENDING_REVIEW
- [ ] E2E: trigger `invoice.payment_failed` (test card 4000000000000002 or dunning off) → listing SUSPENDED + grace date set + AuditLog LISTING_SUSPEND
- [ ] E2E: `customer.subscription.deleted` (cancel in dashboard) → listing SUSPENDED
- [ ] E2E: rejected signup (card 4000000000009995) → listing PENDING_REVIEW, no subscription row
- [ ] Test webhook signature verification (bad `STRIPE_WEBHOOK_SECRET` → 400, no state change)

## Phase 3 — Feeds, CRM, billing, decommission

- [x] Feed ingestion cron (Inngest) + curation UI (`/admin/feeds`, `/admin/feeds/[id]`: RSS/Atom parse via rss-parser, fingerprint-deduped FeedItem upserts, `feed-sync` cron every 6h + `feed/sync.all|one` events, Sync now / Activate / approve→SearchArticle / trash; 10 parser unit tests + 2 integration tests; migration `feed_ingestion`)
- [x] Leads/clients/invoices admin; reports + exports (`/admin/leads` list+detail w/ status/disposition, notes, to-dos; `/admin/clients` list+detail w/ masked card, totals, invoice history; `/admin/invoices` status filter + audit-logged override; `/admin/reports` KPIs; `/api/admin/exports?kind=leads|clients|invoices` CSV w/ admin-cookie auth; CSV lib unit-tested)
- [x] Stripe Connect merchant pool, dunning, webhooks (refund/chargeback) — legacy §4.6 (`Merchant` model + migration `merchant_pool`; `/admin/merchants` add/activate/audit; `billing/dunning.run` job — hourly cron, grace-expiry sweep → EXPIRED + LISTING_EXPIRE audit; webhook: invoice.payment_succeeded → dunning recovery → LIVE, charge.refunded → Invoice REFUNDED + REFUND audit, charge.dispute.created → CHARGEDBACK + audit; 2 dunning integration tests; live-key E2E stays under the Phase 2 deferred list)
- [x] Traffic cutover; freeze & archive legacy PHP app — **runbook**: `docs/cutover-runbook.md` (parity gate, atomic DNS switch, legacy 410 + archive, 7-day watchlist, rollback rules). Execution is ops-gated: needs production access + live Stripe keys + Phase 0 production exports

## Risks / watch items

- `masternet.sql` is a reference schema + one sample tenant — production exports (one per client site) are required for real data; row counts will differ per tenant
- Legacy SHA1 hashes must be force-reset or migrated via a one-time rehash flow
- `tblSearchListing` has ~90 columns — confirm column semantics with stakeholders
- Keep token strings backward-compatible during content migration (normalize `~region~` → `{{region}}`)
- Confirm whether production sites share one database (with different domain keys) or have one DB per site — this decides `Tenant` implementation (shared-vs-isolated schema)

# Canopy V2

The modernized rebuild of the **Canopy / MasterNet** platform (legacy PHP app in the parent folder).

**What it is**: a paid SEO directory + lead-generation + CRM + subscription-billing platform for the
Christian behavioral-health market — searchable company listings with per-state/per-city SEO pages,
a write-once → render-everywhere localization engine, admin-opt-out company suppression, paid listing
tiers, clinical-intake lead pipeline, and recurring billing.

**Design authority**: `../canopy-architecture.md` (full legacy analysis + modernization blueprint).
This repo implements §6 (target stack), §6.5 (localization engine v2) and §6.7 (paid directory).

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui; brand theme package (per-tenant) |
| Data | PostgreSQL 16 + Prisma (`packages/db`) |
| Cache | Redis (Upstash) |
| Auth | Auth.js (NextAuth) — roles/permissions RBAC |
| APIs | tRPC (admin) + REST route handlers (external integrations) |
| Jobs | Inngest — feed ingestion, region-variant generation, rebills, exports |
| Payments | Stripe (subscriptions; Connect for merchant pool) |
| Email | Resend + React Email |
| Uploads | S3 + Sharp |
| Search | Postgres FTS (Typesense later) |
| Observability | OpenTelemetry (traces on jobs), Sentry, structured logs |

## Repository layout

```
canopy-v2/
├── apps/web/            # Next.js app
│   ├── app/
│   │   ├── (site)/      # public SEO pages: /, /g/[category]/[region], /search, /feeds, /apply, /checkout
│   │   ├── (admin)/     # back office: leads, clients, listings, exclusions, reports
│   │   └── api/         # external integration routes (leads, clients, webhooks, adserver)
│   └── src/lib/         # services: localization renderer, listing-visibility gate, billing
├── packages/db/         # Prisma schema + generated client + seeds
├── packages/ui/         # shared component library (shadcn-based)
├── packages/jobs/       # Inngest functions (region variants, feed cron, dunning, exports)
└── docs/                # decision records + migration checklist
```

## Core design decisions (must keep)

1. **Localization = templates + tokens, materialize on publish.** Content authored once with
   `{{region}}`, `{{in region}}`, `{{near region}}` … tokens; variants generated per selected region,
   stored, served as static pages (ISR). Region selector + preview before publish. (Legacy §4.2 → §6.5)
2. **Visibility enforced at one query layer.** `getVisibleListings()` is the single gate: suppressed
   (admin opt-out), unpaid, suspended and expired listings never render — category pages, region pages,
   feeds, topics, search, sitemap, structured data all go through it. (Legacy §4.10 → §6.7)
3. **Paid directory tiers.** Suppressed (never shown) / Free (hidden after grace) / Standard (paid,
   listed) / Premium (paid, featured top + landing page). Stripe subscription + admin review queue +
   dunning → suspend → expire. (Legacy §4.10 → §6.7)
4. **Region model is the universe.** 51 states + cities, `areaPart` (N/S/E/W/C), slugs; category ×
   region content rows; Nearby-Areas listing↔region m2m.
5. **Fulfillment via webhooks + jobs.** POSTSIGNUP/CSVSIGNUP services and product fulfillment reuse
   the same job/queue primitives as rebills and exports. (Legacy §4.6)

## Robustness upgrades beyond the legacy system (folded in)

- **Multi-tenancy readiness**: `Tenant` model sits upstream of Company; all public routes keyed by
  tenant domain; brand theme per tenant (compiles down to the legacy `custom/` override concept).
- **Audit trail**: `AuditLog` on every admin action (suppression add/remove, approval, refund, tier
  change) with actor + reason — legacy had none.
- **Security**: bcrypt/argon2, per-client API keys with scopes, CSRF via server actions, no secrets in
  client bundles, strict zod validation on every input.
- **Per-region statuses & scheduling**: draft → scheduled → live per region-variant (gap in legacy §5.6).
- **Observability**: OpenTelemetry traces on region-generation jobs, Stripe webhook handlers, feed cron;
  alerting on rebill failure rates and suppressor leakage (a suppressed listing rendered = bug).
- **Testing**: vitest for the token renderer + visibility gate (these two are the highest-risk logic);
  Playwright E2E for checkout and region publish flow.

## Getting started (Phase 0)

1. `cd canopy-v2 && npm install` — note: this volume is slow; the first install (Next + react + tooling) can take 10-20+ minutes. Be patient, do not interrupt.
2. `packages/db`: `npm run db:generate` (schema: `packages/db/prisma/schema.prisma`)
3. `apps/web`: configure env (DATABASE_URL, REDIS_URL, STRIPE_*, AUTH_SECRET, INNGEST_DEV=1) from `env.example`
4. Postgres: `npm run db:deploy --workspace=db && npm run db:seed --workspace=db`
5. `npm test` (vitest — localization renderer + visibility gate) / `npm run dev`
6. Integration tests (Prisma repo + variant publish, need a seeded DB):
   `CANOPY_INTEGRATION=1 npm test` — skipped by default so CI stays DB-free.
7. Prisma-backed catalog: `CATALOG_REPO=prisma` in `apps/web/.env.local` (default is the in-memory mock).

> Work order follows §6.4: localization engine v2 → listings/search + paid directory → feeds →
> CRM + billing. The legacy PHP app stays live until full parity + traffic cutover.
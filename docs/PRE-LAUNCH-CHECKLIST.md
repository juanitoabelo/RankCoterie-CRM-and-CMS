# Pre-Launch Checklist — Canopy V2

## Phase 0 — Data Pipeline

- [ ] Obtain `masternet.sql` file (from legacy PHP parent folder)
- [ ] Load `masternet.sql` into a MySQL staging DB (`mysql -u root canopy_legacy_staging < masternet.sql`)
- [ ] Dry-run migration: `npx tsx scripts/migrate-legacy.ts --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" --tenant-id "tenant-masternet" --dry-run`
- [ ] Run migration: `npx tsx scripts/migrate-legacy.ts --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" --tenant-id "tenant-masternet"`
- [ ] Verify parity: `npx tsx scripts/verify-migration.ts --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" --tenant-id "tenant-masternet"`
- [ ] Force password resets for all migrated users (legacy SHA1 → argon2 rehash)
- [ ] Obtain production exports: one `mysqldump` per live client site
- [ ] Run migration for each production tenant (repeat with different `--tenant-id` / `--tenant-name` / `--tenant-domain`)
- [ ] Verify row-count parity per production tenant
- [ ] Confirm PII masking is correct (run with `--mask-pii` for dev/staging)

## Phase 2 — Stripe Verification (TEST keys)

- [ ] Create Stripe test account and get `sk_test_*` / `pk_test_*` keys
- [ ] Create products + prices in Stripe Dashboard (Standard tier, Premium tier, Setup fee)
- [ ] Set all `STRIPE_*` vars in `apps/web/.env.local` (see `.env.example`)
- [ ] Start dev server: `npm run dev`
- [ ] Start webhook listener: `npm run stripe:listen` → copy `whsec_*` to `STRIPE_WEBHOOK_SECRET`
- [ ] E2E: `/apply` → Checkout with `4242 4242 4242 4242` → verify listing flips LIVE + subscription created + AuditLog `LISTING_APPROVE`
- [ ] E2E: Cancel checkout → verify listing stays `PENDING_REVIEW`
- [ ] E2E: Trigger `invoice.payment_failed` → verify listing `SUSPENDED` + 7-day grace + AuditLog `LISTING_SUSPEND`
- [ ] E2E: Cancel subscription in dashboard → verify listing `SUSPENDED` (no grace)
- [ ] E2E: Rejected signup with `4000 0000 0000 9995` → verify no subscription, listing `PENDING_REVIEW`
- [ ] Test webhook signature: send bad signature → expect 400
- [ ] Run automated tests: `npm run test:stripe` (in `apps/web`)

## Post-Migration

- [ ] Run `npm run db:deploy` to apply any pending Prisma migrations
- [ ] Run `npm run db:seed` to reset dev data (optional, after migration testing)
- [ ] Verify all admin pages load correctly with migrated data
- [ ] Verify public SEO pages (`/g/[category]/[region]`) render with migrated content
- [ ] Test lead detail page with clinical intake data
- [ ] Test client/invoice pages with migrated billing data

## Production Cutover

- [ ] Switch Stripe keys from test to **live** mode (`sk_live_*` / `pk_live_*`)
- [ ] Create live products + prices in Stripe Dashboard
- [ ] Update `STRIPE_*` env vars in production with live keys
- [ ] Set `STRIPE_WEBHOOK_SECRET` to live webhook signing secret
- [ ] Run `stripe listen --forward-to https://your-domain.com/api/webhooks/stripe` (production webhook endpoint)
- [ ] Verify live checkout flow with real card (small amount)
- [ ] Follow `docs/cutover-runbook.md` for DNS switch + legacy freeze
- [ ] Monitor 7-day watchlist for issues

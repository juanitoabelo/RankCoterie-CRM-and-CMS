# Canopy V2 — Production Cutover Runbook (Phase 3d)

**Goal**: move the legacy PHP app(s) from "source of truth" to "frozen archive" with zero
downtime for public SEO traffic, and a single atomic DNS switch.

**Status**: runbook complete. Execution is **ops-gated** — requires production access
(DB dumps, DNS, live Stripe keys, deploy target). Nothing here can run from a dev checkout.

---

## 0. Prerequisites (all must be done first)

- [ ] Live Stripe keys + the full **Phase 2 deferred Stripe verification** list in
      `migration-checklist.md` completed against production-mode (test keys → live keys).
- [ ] Phase 0 data pipeline run: production `mysqldump` per tenant exported, migrated into
      Postgres, row-count parity report green (`scripts/verify-migration.ts`).
- [ ] Production deploy of `canopy-v2` (build, migrations via `prisma migrate deploy`,
      Inngest routes served, Postgres reachable, backups verified).
- [ ] A dry-run of this runbook on the staging reference DB with masked fixtures.

## 1. Pre-cutover verification (parity gate)

1. Public surface diff: for each legacy URL shape (`/g/{category}/{region}.html|.php`,
   `/search`, `/feeds`, listing pages, sitemap) compare rendered HTML title/H1/canonical
   between legacy and V2 — must match (V2 301s legacy paths already; see `proxy.ts`).
2. Verify sitemap parity: V2 `sitemap.xml` URL count vs legacy sitemap URL count.
3. Verify admin: log in, run one of each action (listings approve, exclusion add,
   feed sync, lead status change, invoice override, merchant toggle, CSV export).
4. Verify dunning path with live keys (or test keys in production env temporarily):
   `invoice.payment_failed` → SUSPENDED + grace; `dunning` job → EXPIRED after grace;
   `invoice.payment_succeeded` → reinstated LIVE.
5. Confirm `canopy-architecture.md` §6.7.3.1 visibility gate parity with legacy §4.10
   (suppressed/expired listings absent from every surface).

## 2. DNS switch (atomic, ~0 downtime)

1. Freeze writes to legacy: switch legacy DB to read-only (or accept the last-write
   window — leads submitted in the final minutes are re-imported in step 4).
2. Point the production domain's A/CNAME at the V2 host; keep the legacy host on a
   staging subdomain (`legacy.` + existing domain) for 30 days.
3. Watch logs for the first 30 min: 4xx spikes, `/g/` 404s, checkout errors, webhook
   signature failures, Inngest function failures.
4. Backfill the write window: re-run the lead import for timestamps ≥ freeze time.

## 3. Legacy freeze + archive

1. Set legacy host to serve a static "site maintenance / moved" page (404/410 semantics:
   return 410 Gone on all legacy routes so search engines drop them).
2. Snapshot: `mysqldump` all live client DBs → encrypted archive (S3/object storage,
   versioned, lifecycle 7y). Record checksums in the archive manifest.
3. Tag the legacy codebase repo (freeze tag) and lock the branch (no merges).
4. Keep `legacy.` staging subdomain up for 30 days for operator access to old records;
   document the archive location + restore procedure in the ops wiki.
5. After 30 days: delete the legacy staging host, keep only the archived dumps + repo tag.

## 4. Post-cutover watchlist (first 7 days)

- [ ] Stripe webhook delivery failures (Inngest run logs) — every event must be acked.
- [ ] `invoice.payment_failed` / dunning expiry rate vs legacy rebill failure baseline.
- [ ] Suppression leakage: any page rendering a `SUPPRESSED`/`EXPIRED` listing = bug (alert).
- [ ] Lead form submissions landing in V2 (`/admin/leads` counts) — compare to legacy daily avg.
- [ ] Google Search Console: 404/410 trends, index coverage, sitemap submission.
- [ ] Backup restore drill (one tenant) to prove the archive procedure works.

## 5. Rollback decision rules

- Roll back (DNS revert) if, in the first 24h: checkout failure rate > 5%, or
  `/g/` 404 rate > 1%, or webhook unacked events > 10.
- Rollback does NOT revert Postgres (V2-only data stays); legacy remains read-only; the
  write-window backfill in step 2.4 runs after each rollback attempt.
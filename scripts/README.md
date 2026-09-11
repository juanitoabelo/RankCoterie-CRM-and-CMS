# Canopy V2 — Scripts

## Migration Pipeline (Phase 0)

### Prerequisites

```bash
# Install mysql2 for reading legacy MariaDB
npm install mysql2 --save-dev
```

### 1. Load the legacy dump into a MySQL staging DB

```bash
# Create a staging database
mysql -u root -e "CREATE DATABASE canopy_legacy_staging"

# Load the dump
mysql -u root canopy_legacy_staging < masternet.sql
```

### 2. Run the migration

```bash
# Dry run (shows what would be migrated, no DB writes)
npx tsx scripts/migrate-legacy.ts \
  --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" \
  --tenant-id "tenant-masternet" \
  --tenant-name "MasterNet" \
  --tenant-domain "masternet.org" \
  --dry-run

# Real migration
npx tsx scripts/migrate-legacy.ts \
  --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" \
  --tenant-id "tenant-masternet" \
  --tenant-name "MasterNet" \
  --tenant-domain "masternet.org"

# With PII masking (for dev/staging)
npx tsx scripts/migrate-legacy.ts \
  --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" \
  --tenant-id "tenant-masternet" \
  --tenant-name "MasterNet" \
  --tenant-domain "masternet.org" \
  --mask-pii
```

### 3. Verify migration

```bash
npx tsx scripts/verify-migration.ts \
  --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" \
  --tenant-id "tenant-masternet"

# JSON output
npx tsx scripts/verify-migration.ts \
  --mysql-url "mysql://root@localhost:3306/canopy_legacy_staging" \
  --tenant-id "tenant-masternet" \
  --json
```

### 4. Post-migration steps

- Force password resets for all users (legacy SHA1 → argon2 rehash)
- Verify PII masking if `--mask-pii` was used
- Check row count parity report

### What gets migrated

| Legacy Table | V2 Model | Notes |
|---|---|---|
| `tblRegions` | `Region` | Slug generated from `DomainKey` |
| `tblSearchCategoryParent` | `Category` | Parent/child hierarchy preserved |
| `tblSearchCategoryRegionContent` | `CategoryRegionContent` | AreaPart mapping |
| `tblSearchCategoryRegionFeeds` | `CategoryRegionFeed` | Feed references |
| `tblSearchListing` + sub-tables | `Listing` + m2m | tier=FREE, no subscription |
| `tblFeeds` / `tblFeedListings` | `Feed` / `FeedItem` | SHA1 fingerprint dedup |
| `tblSearchArticles` | `SearchArticle` | Approved/rejected status |
| `tblSearchTopics` | `ContentTemplate` | Draft status |
| `tblUsers` | `User` | Placeholder password hash |
| `tblLeads` + intake | `Lead` | Clinical intake JSON |
| `tblPages` | `Page` | Builder data |
| `tblMenuBuilder` / `tblMenuItems` | `Menu` / `MenuItem` | Hierarchy |
| `tblCompany` / `tblSystem` | `Company` | Contact info, social, tracking |
| `tblExclusions` | `ExcludedCompany` | Active/inactive |

### Charset handling

Legacy tables use `latin1` charset. The migration script detects this and converts to UTF-8:

```
Buffer.from(value, 'latin1').toString('utf8')
```

### PII guardrails

- `--mask-pii` replaces all PII fields with `***`
- Never load production PII into local dev
- Use masked fixtures per environment
- Email, phone, name fields are masked

---

## Stripe Verification (Phase 2)

### Prerequisites

1. Set test-mode keys in `apps/web/.env.local` (see `apps/web/.env.example`)
2. Start the dev server: `npm run dev`
3. Start Stripe webhook listener: `npm run stripe:listen`

### Run the interactive checklist

```bash
bash scripts/stripe-verify.sh
```

### Run automated E2E tests

```bash
cd apps/web
npm run test:stripe
```

### Test cards

| Card | Behavior |
|---|---|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Declined (dunning flow) |
| `4000 0000 0000 9995` | Rejected signup |
| `4000 0025 0000 3155` | 3D Secure required |

### Stripe CLI triggers

```bash
# Simulate webhook events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
```

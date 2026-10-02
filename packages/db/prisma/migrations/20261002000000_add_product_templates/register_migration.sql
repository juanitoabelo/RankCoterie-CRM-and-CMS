-- Run this AFTER the migration SQL to register it with Prisma (only needed when applied manually, e.g. on a DB previously synced with `prisma db push`).
-- checksum = sha256 hex of migration.sql
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
  'manual_20261002000000',
  '8170f72f4b0513350be7c8e07e996056bf4bda5ab461c88c36fb30696dae9b2e',
  CURRENT_TIMESTAMP,
  '20261002000000_add_product_templates',
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  1
)
ON CONFLICT ("id") DO NOTHING;

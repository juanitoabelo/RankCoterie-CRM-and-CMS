-- Run this AFTER the migration SQL to register it with Prisma
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
  'manual_20260922120000',
  'manual_add_missing_schema_elements',
  CURRENT_TIMESTAMP,
  '20260922120000_add_missing_schema_elements',
  NULL,
  NULL,
  CURRENT_TIMESTAMP,
  1
);

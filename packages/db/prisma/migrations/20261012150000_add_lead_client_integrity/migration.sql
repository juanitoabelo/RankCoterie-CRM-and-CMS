-- Client ↔ Lead conversion integrity: one client per converted lead.
-- Dedupe any pre-existing duplicate leadId assignments first (keep the oldest client).
UPDATE "Client" c
SET "leadId" = NULL
FROM (
  SELECT "leadId", MIN("createdAt") AS "keepAt"
  FROM "Client"
  WHERE "leadId" IS NOT NULL
  GROUP BY "leadId"
  HAVING COUNT(*) > 1
) d
WHERE c."leadId" = d."leadId"
  AND c."createdAt" > d."keepAt";

CREATE UNIQUE INDEX IF NOT EXISTS "Client_leadId_key" ON "Client"("leadId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Client_leadId_fkey'
  ) THEN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Public lead capture (listing contact form / claim) → CRM Lead linkage.
ALTER TABLE "ListingLead" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ListingLead_leadId_fkey'
  ) THEN
    ALTER TABLE "ListingLead" ADD CONSTRAINT "ListingLead_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ListingLead_leadId_idx" ON "ListingLead"("leadId");

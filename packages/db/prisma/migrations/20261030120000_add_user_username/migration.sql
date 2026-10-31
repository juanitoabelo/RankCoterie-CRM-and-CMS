-- Add a real login username to User, then backfill every existing account from
-- its email local part so legacy accounts can sign in with either identifier.
ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = LEFT(
  LOWER(
    REGEXP_REPLACE(
      SPLIT_PART("email", '@', 1),
      '[^a-zA-Z0-9._-]',
      '',
      'g'
    )
  ),
  30
)
WHERE "username" IS NULL;

UPDATE "User"
SET "username" = 'user-' || LOWER("id")
WHERE "username" IS NULL OR "username" = '';

-- Emails are unique per tenant, but local parts are not guaranteed to be.
-- Suffix any collision with the row number so the result stays under 30 chars.
WITH ranked AS (
  SELECT
    "id",
    "username",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "username"
      ORDER BY "createdAt", "id"
    ) AS rn
  FROM "User"
)
UPDATE "User" u
SET "username" = LEFT(ranked."username", 20) || '-' || ranked.rn::text
FROM ranked
WHERE u."id" = ranked."id" AND ranked.rn > 1;

CREATE UNIQUE INDEX "User_tenantId_username_key" ON "User"("tenantId", "username");

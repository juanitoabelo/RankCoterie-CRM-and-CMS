ALTER TABLE "Subscription" ADD COLUMN "planKey" TEXT NOT NULL DEFAULT '';

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "orderId", "productId", COALESCE("variantId", '')
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS "rn"
  FROM "Subscription"
)
UPDATE "Subscription" AS s
SET "planKey" = s."productId" || '::' || COALESCE(s."variantId", '') || CASE WHEN r."rn" = 1 THEN '' ELSE '::' || s."id" END
FROM ranked AS r
WHERE r."id" = s."id";

CREATE UNIQUE INDEX "Subscription_tenantId_orderId_planKey_key" ON "Subscription"("tenantId", "orderId", "planKey");

ALTER TABLE "Subscription" ALTER COLUMN "planKey" DROP DEFAULT;

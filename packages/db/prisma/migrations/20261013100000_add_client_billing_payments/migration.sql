-- Client-billing payment separation:
--  * PaymentGateway.purpose — which use case a gateway serves
--    (CLIENT_BILLING vs ECOMMERCE vs LISTING vs GENERAL).
--  * Invoice payment-link fields — hosted Stripe Payment Link, gateway used,
--    paid/email timestamps.

DO $$ BEGIN
  CREATE TYPE "PaymentGatewayPurpose" AS ENUM ('GENERAL', 'CLIENT_BILLING', 'ECOMMERCE', 'LISTING');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "PaymentGateway" ADD COLUMN IF NOT EXISTS "purpose" "PaymentGatewayPurpose" NOT NULL DEFAULT 'GENERAL';
CREATE INDEX IF NOT EXISTS "PaymentGateway_tenantId_purpose_idx" ON "PaymentGateway"("tenantId", "purpose");

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "gatewayId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "payUrl" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "emailSentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Invoice_gatewayId_idx" ON "Invoice"("gatewayId");

DO $$ BEGIN
  ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_gatewayId_fkey"
    FOREIGN KEY ("gatewayId") REFERENCES "PaymentGateway"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

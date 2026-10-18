-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "merchantId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_merchantId_idx" ON "Invoice"("merchantId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_merchantId_fkey'
  ) THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_merchantId_fkey"
      FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

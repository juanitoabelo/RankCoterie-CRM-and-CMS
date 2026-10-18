-- Company listing billing: which landing page this invoice settles.
-- Paid setup/tier invoices flip the linked company page to LIVE.
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "listingId" TEXT;
CREATE INDEX IF NOT EXISTS "Invoice_listingId_idx" ON "Invoice"("listingId");

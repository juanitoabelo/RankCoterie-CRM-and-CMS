-- Stripe payment link id on the invoice so the link can be deactivated
-- after payment (links are reusable by default — double-charge protection).
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "stripePaymentLinkId" TEXT;

-- Checkout idempotency: at most one order per (tenant, checkout token).
-- Rows without a checkoutToken (legacy/manual) evaluate to NULL and are exempt from the uniqueness rule.
CREATE UNIQUE INDEX IF NOT EXISTS "Order_tenantId_checkoutToken_key"
ON "Order"("tenantId", (meta->>'checkoutToken'));

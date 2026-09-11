#!/usr/bin/env bash
# =============================================================================
# Canopy V2 — Stripe Phase 2 Verification Checklist Runner
# =============================================================================
# Interactive script that walks through each Stripe E2E verification step.
# Prerequisites:
#   1. .env.local configured with test-mode Stripe keys (see .env.example)
#   2. Dev server running: npm run dev
#   3. Stripe CLI installed and listening: npm run stripe:listen
#
# Usage:
#   bash scripts/stripe-verify.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step() {
  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  Step $1: $2${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() { echo -e "${GREEN}  ✓ PASS${NC}"; }
fail() { echo -e "${RED}  ✗ FAIL: $1${NC}"; }
info() { echo -e "${YELLOW}  ℹ $1${NC}"; }

# Check prerequisites
echo -e "${CYAN}=== Canopy V2 — Stripe Phase 2 Verification ===${NC}"

step 0 "Checking prerequisites"

if [ -f apps/web/.env.local ]; then
  if grep -q 'sk_test_' apps/web/.env.local 2>/dev/null; then
    pass
    info "Test-mode Stripe key found in .env.local"
  else
    fail "No sk_test_* key found in .env.local"
    info "Copy .env.example to .env.local and add test-mode keys"
    exit 1
  fi
else
  fail ".env.local not found"
  info "Copy .env.example to .env.local"
  exit 1
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
  pass
  info "Dev server is running on localhost:3000"
else
  fail "Dev server not running"
  info "Run: npm run dev"
  exit 1
fi

# Step 1: Set test-mode keys
step 1 "Set test-mode Stripe keys in .env.local"
info "Already verified above — keys are in .env.local"
pass

# Step 2: Run stripe listen
step 2 "Run stripe listen for webhook forwarding"
info "In a separate terminal, run:"
info "  npm run stripe:listen"
info "Copy the webhook signing secret (whsec_*) to STRIPE_WEBHOOK_SECRET in .env.local"
echo ""
read -p "  Have you started stripe listen and set the webhook secret? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pass
else
  fail "Please start stripe listen first"
  exit 1
fi

# Step 3: E2E — /apply → Checkout → LIVE
step 3 "E2E: /apply → Checkout → LIVE + subscription + audit"
info "Open http://localhost:3000/apply in your browser"
info "Fill in the form with test data and submit"
info "Complete Stripe Checkout with test card: 4242 4242 4242 4242"
info "Expiry: 12/34, CVC: 123"
info ""
info "Verify:"
info "  - Redirected to /checkout/success"
info "  - In Stripe Dashboard: subscription is active"
info "  - In DB: Listing status = LIVE, ListingSubscription created"
info "  - In DB: AuditLog entry with action LISTING_APPROVE"
echo ""
read -p "  Did the checkout complete successfully? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pass
else
  fail "Checkout flow failed"
fi

# Step 4: E2E — Cancel checkout
step 4 "E2E: Cancel checkout → stays PENDING_REVIEW"
info "Go to /apply again and submit a new listing"
info "On the Stripe Checkout page, click 'Cancel' or navigate to the cancel URL"
info "Verify: listing stays PENDING_REVIEW (no subscription created)"
echo ""
read -p "  Did the listing stay PENDING_REVIEW? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pass
else
  fail "Cancel flow did not work correctly"
fi

# Step 5: E2E — Payment failed
step 5 "E2E: Trigger invoice.payment_failed → SUSPENDED + grace"
info "Option A (manual):"
info "  In Stripe Dashboard → Subscriptions, find a test subscription"
info "  Update its payment method to card 4000 0000 0000 0002"
info "  Trigger an invoice retry"
info ""
info "Option B (CLI):"
info "  stripe trigger invoice.payment_failed"
info ""
info "Verify:"
info "  - Listing status → SUSPENDED"
info "  - ListingSubscription.paymentGraceUntil set to now + 7 days"
info "  - AuditLog entry with action LISTING_SUSPEND"
echo ""
read -p "  Did the dunning flow work? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pass
else
  fail "Dunning flow failed"
fi

# Step 6: E2E — Subscription deleted
step 6 "E2E: customer.subscription.deleted → SUSPENDED"
info "In Stripe Dashboard → Subscriptions, cancel a test subscription"
info "Verify:"
info "  - Listing status → SUSPENDED"
info "  - ListingSubscription.paymentGraceUntil = null"
info "  - AuditLog entry with action LISTING_SUSPEND"
echo ""
read -p "  Did the subscription deletion work? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pass
else
  fail "Subscription deletion flow failed"
fi

# Step 7: E2E — Rejected signup
step 7 "E2E: Rejected signup (card 4000000000009995)"
info "Go to /apply and submit a new listing"
info "Complete Stripe Checkout with test card: 4000 0000 0000 9995"
info "Verify:"
info "  - Card is rejected by Stripe"
info "  - No checkout.session.completed webhook fires"
info "  - Listing stays PENDING_REVIEW"
info "  - No ListingSubscription row created"
echo ""
read -p "  Was the signup rejected correctly? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pass
else
  fail "Rejected signup flow failed"
fi

# Step 8: Webhook signature verification
step 8 "Test webhook signature verification"
info "Send a request with an invalid signature:"
info "  curl -X POST http://localhost:3000/api/webhooks/stripe \\"
info "    -H 'Content-Type: application/json' \\"
info "    -H 'stripe-signature: invalid_sig' \\"
info "    -d '{\"type\":\"test\"}'"
info ""
info "Verify: returns 400 'Invalid signature'"
echo ""
read -p "  Did the signature check work? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  pass
else
  fail "Signature verification failed"
fi

# Summary
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Phase 2 Stripe verification checklist complete!${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Admin Configuration Setup Guide

## Prerequisites
- Deployed application URL (e.g., `https://your-domain.com`)
- Admin access to the application
- Access to Stripe, PayPal, Square developer dashboards
- Resend account for email sending

---

## 1. Payment Gateway Configuration

### Stripe Setup

#### 1.1 Get API Keys
1. Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
2. Copy **Publishable key** (`pk_test_...` or `pk_live_...`)
3. Copy **Secret key** (`sk_test_...` or `sk_live_...`)

#### 1.2 Configure Webhook
1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.expired`
   - `charge.refunded`
5. Click **Add endpoint**
6. Copy **Signing secret** (`whsec_...`)

#### 1.3 Configure in Admin
1. Go to Admin → Configure Payment Gateway (`/admin/payment-gateways`)
2. Click **Add Gateway** → Select **Stripe**
3. Fill in:
   - **Name**: Stripe
   - **Publishable Key**: `pk_...`
   - **Secret Key**: `sk_...`
   - **Webhook Secret**: `whsec_...`
   - **Test Mode**: Check for test, uncheck for live
   - **Priority**: 1
   - **Enabled**: Yes
4. Save

#### 1.4 Verify Stripe
```bash
# Run verification script
npm run verify:stripe
```

---

### PayPal Setup

#### 2.1 Get REST App Credentials
1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. My Apps & Credentials → **Create App**
3. App Name: "Canopy Storefront"
4. Copy **Client ID** and **Secret**

#### 2.2 Configure Webhook
1. In the app details → **Webhooks** → **Create Webhook**
2. Webhook URL: `https://your-domain.com/api/webhooks/paypal`
3. Select events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.SALE.COMPLETED`
4. Copy **Webhook ID** (`WH-...`)

#### 2.3 Configure in Admin
1. Admin → Configure Payment Gateway → **Add Gateway** → **PayPal**
2. Fill in:
   - **Name**: PayPal
   - **Client ID**: from step 2.1
   - **Secret**: from step 2.1
   - **Webhook ID**: `WH-...` from step 2.2
   - **Test Mode**: Check for sandbox
3. Save

#### 2.4 Verify PayPal
```bash
npm run verify:paypal
```

---

### Square Setup

#### 3.1 Get App Credentials
1. Go to [Square Developer Dashboard](https://developer.squareup.com/)
2. Select your application
3. Copy **Application ID**, **Access Token**, **Location ID**

#### 3.2 Configure Webhook
1. Webhooks → **Subscribe**
2. URL: `https://your-domain.com/api/webhooks/square`
3. Events:
   - `payment.updated`
   - `payment.created`
   - `order.updated`
4. Copy **Signature Key**

#### 3.3 Configure in Admin
1. Admin → Configure Payment Gateway → **Add Gateway** → **Square**
2. Fill in:
   - **Name**: Square
   - **Application ID**: from step 3.1
   - **Access Token**: from step 3.1
   - **Location ID**: from step 3.1
   - **Webhook Signature Key**: from step 3.2
   - **Test Mode**: Check for sandbox
3. Save

#### 3.4 Verify Square
```bash
npm run verify:square
```

---

## 2. Server Environment Variables

Add to your deployed host's `.env` file:

```bash
# Required
SITE_URL=https://your-domain.com
RESEND_API_KEY=re_...
EMAIL_FROM=Canopy <orders@your-domain.com>

# Optional (if not using gateway config)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional cron overrides
# ABANDONED_ORDER_MINUTES=60
# ABANDONED_CRON="*/5 * * * *"
# DUNNING_CRON="0 * * * *"
```

**Important**: After setting `RESEND_API_KEY`, emails will start sending. Without it, emails are only logged.

---

## 3. Background Jobs (Inngest)

### 3.1 Deploy & Register
1. Deploy your application
2. Go to [Inngest Dashboard](https://app.inngest.com/)
3. The endpoint `/api/inngest` should auto-register
4. Verify these functions appear:
   - `orders/abandoned.run` (cron: every 5 min)
   - `orders/dunning.run` (cron: hourly)
   - `feed/sync.run`
   - `variant/publish.run`

### 3.2 Verify Abandoned Order Sweep
```bash
# Trigger manually
curl -X POST https://your-domain.com/api/inngest \
  -H "Content-Type: application/json" \
  -d '{"name": "orders/abandoned.run", "data": {}}'

# Or via Inngest dashboard: Functions → orders/abandoned.run → Run
```

**Expected**: PENDING orders older than 60 min become CANCELLED, stock/coupon released.

---

## 4. Storefront Configuration (Admin UI)

### 4.1 Tax Settings
1. Admin → Tax
2. Add default tax rate:
   - Name: "Default Tax"
   - Rate: 0.08 (8%)
   - Country: US (or your default)

### 4.2 Shipping Settings
1. Admin → Shipping
2. Add shipping method:
   - Name: "Standard Shipping"
   - Rate: 9.99
   - Type: Flat rate

### 4.3 Store Front Settings
1. Admin → Store Settings
2. Configure:
   - Currency: USD
   - Low stock threshold: 10
   - Store name: "Your Store Name"

---

## Verification Checklist

After all configuration, run the full verification:

```bash
# Run all verifications
npm run verify:all
```

This will:
1. Test Stripe webhook signature verification
2. Test PayPal webhook signature verification
3. Test Square webhook signature verification
4. Create test order per gateway → verify PAID status + email
5. Verify abandoned order sweep works
6. Verify emails send correctly

---

## Troubleshooting

### Webhooks Not Firing
- Check `SITE_URL` matches exactly (no trailing slash)
- Verify webhook URL is accessible from internet
- Check Inngest dashboard for function execution logs

### Emails Not Sending
- Verify `RESEND_API_KEY` is set
- Check `EMAIL_FROM` is a verified domain in Resend
- Check application logs for email errors

### Orders Not Going to PAID
- Verify webhook secrets match exactly
- Check Stripe/PayPal/Square dashboard for webhook delivery attempts
- Review application logs for webhook errors
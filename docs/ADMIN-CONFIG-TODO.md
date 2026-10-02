# Admin & Environment Configuration TODO

Tasks that **cannot be fixed in code** — they need credentials from third-party
dashboards or values on the deployed server. Tick these off manually before
launch; everything else in the ecommerce build is code-complete.

---

## 1. Payment gateways — credentials + webhook registration (BLOCKS trusted payments)

Values come from the gateway dashboards; paste them into
**Admin → Configure Payment Gateway** (`/admin/payment-gateways`).

### Stripe
- [ ] **API keys**: Stripe Dashboard → Developers → API keys → publishable key (`pk_live_…` / `pk_test_…`) and secret key (`sk_live_…` / `sk_test_…`) → paste into the Stripe gateway config.
- [ ] **Webhook endpoint**: Developers → Webhooks → add endpoint `https://<your-domain>/api/webhooks/stripe` with events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded` → copy the **Signing secret** (`whsec_…`) → paste into the Stripe gateway config (Webhook Secret field).
- [ ] *Fallback alternative*: if the gateway config is left empty, code falls back to server env `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — set these in `.env` on the host instead (pick ONE source of truth).

### PayPal
- [ ] **REST app credentials**: developer.paypal.com → My Apps & Credentials → Client ID + Secret → paste into the PayPal gateway config.
- [ ] **Webhook**: same app → Webhooks → create webhook `https://<your-domain>/api/webhooks/paypal` with events `PAYMENT.CAPTURE.COMPLETED` and `PAYMENT.SALE.COMPLETED` → copy the **Webhook ID** (`WH-…`) → paste into the PayPal gateway config.
- [ ] Uncheck **Sandbox mode** for live, leave checked for testing.

### Square
- [ ] **App credentials**: Square Developer Dashboard → application ID + access token + location ID → paste into the Square gateway config.
- [ ] **Webhook**: Developer Dashboard → Webhooks → subscribe URL `https://<your-domain>/api/webhooks/square` with events `payment.updated`, `payment.created`, `order.updated` → copy the **Signature key** → paste into the Square gateway config (Webhook Signature Key field).
- [ ] Note: Square's signature uses `SITE_URL` + raw body, so `SITE_URL` must be the exact public origin used in the webhook URL (no trailing slash mismatch issues, but keep them identical).

### Gateway verification (after all three are configured)
- [ ] Place a test order per gateway → confirm the order flips to **PAID** in Admin → Orders and the customer receives the paid email (needs `RESEND_API_KEY`, see §2).
- [ ] Send/replay a webhook with a bad signature → expect `401/400` (proves signature verification is active).

---

## 2. Server environment (`.env` on the deployed host)

- [ ] `SITE_URL` — public origin (`https://<your-domain>`); used by email links and Square webhook signature.
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` — order confirmation/status/refund emails are **disabled and only logged** until this is set.
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — only if you did NOT paste them into the gateway config (see §1).
- [ ] Cron overrides (optional): `ABANDONED_ORDER_MINUTES` (default 60), `ABANDONED_CRON` (default every 5 min), `DUNNING_CRON` (default hourly).

---

## 3. Background jobs (Inngest)

Scheduled jobs (`abandoned orders`, `dunning`, `feed sync`, `variant publish`) run
through the Inngest endpoint at `/api/inngest`.

- [ ] Deploy the app, then confirm in the Inngest dashboard that the endpoint registers and the cron functions appear (no key required for the Dev/self-serve flow; set `INNGEST_EVENT_KEY` if using Inngest cloud).
- [ ] Verify the abandoned-order sweep fires: create a PENDING order, wait past the timeout (or send `orders/abandoned.run`), confirm the order is `CANCELLED` and stock/coupon were released.

---

## 4. Non-gateway storefront config (Admin UI, not code)

- [ ] Tax settings: set your default rate/currency rules under **Admin → Tax** (store checkout quotes tax from these).
- [ ] Shipping method label/rate under shipping settings — currently label/flat based.
- [ ] Store front settings: currency, low-stock threshold defaults, and the store name used in emails.

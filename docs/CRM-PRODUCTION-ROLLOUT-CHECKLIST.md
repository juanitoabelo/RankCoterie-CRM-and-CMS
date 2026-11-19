# CRM Production Rollout Checklist

Use this alongside `docs/PRE-LAUNCH-CHECKLIST.md` and `docs/cutover-runbook.md`. Every gate below
must be green before the CRM is treated as production-ready. Do not paste secret values into this
document, tickets, or chat — variable names only.

## 1. Prerequisites

- [ ] Production Postgres reachable from the deployed app; latest backup taken and a restore drill
      completed (see `docs/cutover-runbook.md` §4).
- [ ] All CRM API routes deployed, including `/api/crm/health`, `/api/crm/oauth/sync`,
      `/api/crm/reminders`, `/api/crm/sequences/process`, and `/api/crm/webhooks/dispatch`.
- [ ] `next build` passes and the CRM dashboard/settings pages render with the production tenant.
- [ ] At least one admin account can open `/admin/crm` and `/admin/crm/settings`.
- [ ] Cron host is Vercel (the `crons` entries in `vercel.json` are honored only on Vercel).
- [ ] This checklist's alert thresholds are understood by whoever owns the on-call rotation.

## 2. Secrets and environment variables

All names below come from `apps/web/.env.example`. Set them in the Vercel project (Production
environment) — never in the repository. Verify presence with the Vercel dashboard or
`vercel env ls` (names only); do not echo values in logs.

Core:

- `DATABASE_URL`
- `DIRECT_URL`
- `CATALOG_REPO`
- `SITE_URL`
- `ADMIN_SECRET`
- `SESSION_SECRET`
- `CRM_OAUTH_STATE_SECRET`

Stripe (unchanged by CRM rollout, still required for the platform):

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STANDARD`
- `STRIPE_PRICE_PREMIUM`
- `STRIPE_SETUP_FEE_ID`
- `INNGEST_DEV`

CRM storage, encryption, and OAuth:

- `BLOB_READ_WRITE_TOKEN` — required for production attachment storage; without it attachments
  fall back to Postgres and `/api/crm/health` reports an `error`-level alert.
- `CRM_TOKEN_ENCRYPTION_KEY` — preferred token encryption key (falls back to `SESSION_SECRET`).
- `CRM_OAUTH_REDIRECT_BASE_URL` — must match the callback origin registered with each provider.
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_TENANT_ID`
- `CRM_EMAIL_EVENTS_SECRET` — shared secret for `POST /api/crm/email/events` (bounce, delivery,
  and failure ingestion).
- `CRM_EMAIL_TRACKING_BASE_URL` — optional absolute base URL for tracking links; defaults to
  `SITE_URL` and is never derived from the request `Host` header.

Cron and alerting:

- `CRON_SECRET` — sent automatically by Vercel Cron as `Authorization: Bearer <CRON_SECRET>`.
- `CRM_SYNC_SECRET`
- `CRM_REMINDER_SECRET`
- `CRM_HEALTH_SECRET`
- `CRM_SEQUENCE_SECRET`
- `CRM_WEBHOOK_SECRET`
- `CRM_ALERT_WEBHOOK_URL` — optional Slack-compatible webhook for `reportCrmIssue` alerts.

- [ ] Confirm `SESSION_SECRET` and `CRM_OAUTH_STATE_SECRET` are distinct, long random values.
- [ ] Confirm both OAuth redirect URIs are registered in the provider consoles.
- [ ] Confirm `BLOB_READ_WRITE_TOKEN` is present if production attachment storage is required.
- [ ] Confirm `CRM_ALERT_WEBHOOK_URL` (if used) returns HTTP 2xx; non-2xx is logged as a warning
      and delivery is bounded by a 5s abort timeout.

## 3. Database migration verification

Migrations are owned by `packages/db` and are already added/applied in the rollout branch. Do not
hand-edit them; verify them instead.

- [ ] Check applied state:

  ```sh
  npx prisma migrate status --schema packages/db/prisma/schema.prisma
  ```

  Expected: no pending migrations, including `20261118140000_crm_differentiators` and
  `20261119000000_crm_engagement_and_indexes`.

- [ ] Check schema drift against the migration history (requires a throwaway shadow database):

  ```sh
  npx prisma migrate diff \
    --from-migrations packages/db/prisma/migrations \
    --to-schema-datamodel packages/db/prisma/schema.prisma \
    --shadow-database-url "$SHADOW_DATABASE_URL" \
    --exit-code
  ```

  Expected: no diff / exit code 0.

- [ ] If anything is pending, apply with `npx prisma migrate deploy --schema packages/db/prisma/schema.prisma`.
- [ ] Confirm the new indexes exist in production (query `pg_indexes`; do not log connection strings):

  ```sql
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public' AND indexname IN (
    'CrmEmailMessage_trackingToken_key',
    'CrmEmailMessage_tenantId_dealId_idx',
    'CrmEmailMessage_tenantId_leadId_idx',
    'CrmEmailMessage_tenantId_clientId_idx',
    'CrmEmailMessage_tenantId_status_sentAt_idx',
    'CrmEmailMessage_tenantId_toEmail_idx',
    'CrmEmailEvent_tenantId_messageId_type_occurredAt_idx',
    'CrmEmailEvent_tenantId_enrollmentId_occurredAt_idx',
    'CrmEmailEvent_tenantId_type_occurredAt_idx',
    'CrmEmailEvent_tenantId_providerEventId_idx',
    'CrmEmailSuppression_tenantId_email_key',
    'CrmEmailSuppression_tenantId_active_updatedAt_idx',
    'Lead_tenantId_createdAt_idx',
    'Lead_tenantId_assignedToId_createdAt_idx',
    'Lead_tenantId_lower_email_idx',
    'Client_tenantId_createdAt_idx',
    'Client_tenantId_assignedToId_createdAt_idx',
    'Client_tenantId_lower_email_idx',
    'Deal_tenantId_updatedAt_createdAt_idx',
    'Deal_tenantId_stageId_value_createdAt_idx',
    'Deal_tenantId_createdAt_idx',
    'ToDo_leadId_finishedAt_idx',
    'ToDo_finishedAt_dueAt_idx',
    'ToDo_assigneeId_finishedAt_dueAt_idx',
    'CrmEmailConnection_tenantId_active_lastSyncAt_idx',
    'CrmEmailConnection_active_errors_idx',
    'CrmNotification_tenantId_userId_title_createdAt_idx',
    'AuditLog_tenantId_action_createdAt_idx'
  );
  ```

  Also expect the differentiator-migration indexes: `CrmEmailSequence_tenantId_status_idx`,
  `CrmEmailSequenceStep_sequenceId_position_key`, `CrmEmailSequenceStep_tenantId_sequenceId_idx`,
  `CrmEmailSequenceEnrollment_tenantId_sequenceId_toEmail_key`,
  `CrmEmailSequenceEnrollment_tenantId_status_nextSendAt_idx`,
  `CrmEmailMessage_tenantId_providerMessageId_key`, `CrmEmailMessage_tenantId_enrollmentId_idx`,
  `CrmWorkflow_tenantId_event_enabled_idx`, `CrmWorkflowRun_tenantId_createdAt_idx`,
  `CrmApiKey_keyHash_key`, `CrmApiKey_tenantId_revokedAt_idx`.

- [ ] Compare the returned row count to the expected index list; missing rows block rollout.

## 4. Cron verification

Both `vercel.json` and `apps/web/vercel.json` must contain the same `crons` array. Confirm the
health probe entry:

```json
{ "path": "/api/crm/health", "schedule": "*/15 * * * *" }
```

- [ ] Confirm the deployed project shows five cron jobs: reminders hourly, OAuth sync every 15
      minutes, health every 15 minutes, sequences every 5 minutes, webhook dispatch every 5 minutes.
- [ ] Confirm Vercel Cron invokes `/api/crm/health` without a 401 (the `CRON_SECRET` bearer token is
      supplied automatically).
- [ ] Confirm cron invocation logs show no 5xx and no timeout for the health probe.
- [ ] Confirm `CRM_HEALTH_SECRET` works as the fallback header (`x-crm-health-secret`) for manual
      probes from an operator machine.

## 5. Health and operations alerts

- [ ] Fetch the probe and parse the JSON body:

  ```sh
  curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
    "https://<production-host>/api/crm/health" | jq '{status, checkedAt, alerts}'
  ```

  **Important:** a degraded snapshot is returned with HTTP 200. Do not use the HTTP status alone —
  always parse `status` and `alerts` from the body. Only an exception returns HTTP 503.

- [ ] `status` remains `"ok"` only when `warnings` is empty; `alerts` do not change `status`.
- [ ] `alerts` is an array of `{ id, level, title, details }`; ids are stable across calls.

Alert lookup:

| id                     | level            | Trigger                                                                 |
| ---------------------- | ---------------- | ----------------------------------------------------------------------- |
| `crm.sync.stale`       | warning / error  | `mailConnections > 0`; no sync for >= 45m / >= 120m (never = error)      |
| `crm.reminders.stale`  | warning / error  | No reminder run for >= 120m / >= 360m (never = error)                    |
| `crm.sync.errors`      | warning / error  | `syncErrors >= 1` / `>= 3`                                               |
| `crm.config.N`         | warning          | One per entry in `warnings`, in array order                              |
| `crm.storage.database` | error            | `NODE_ENV=production` and `attachmentStorage === "database"`             |

- [ ] Confirm `/admin/crm` → **Needs attention → Operations alerts** renders the same alerts.
- [ ] Confirm `/admin/crm/settings` → **Operations** shows the alerts and retains the "Health
      endpoint (JSON)" link.
- [ ] Force one alert in staging (e.g. unset `BLOB_READ_WRITE_TOKEN`) and confirm it appears in
      both surfaces and in the webhook payload.

## 6. Canary

### First 24 hours

- [ ] Poll the health JSON at least once per hour; record `status`, `alerts`, `counts.mailConnections`,
      and `syncErrors`.
- [ ] Every connected mailbox syncs at least once per 2 hours (>= 12 successful syncs/24h per
      active connection).
- [ ] Zero `error`-level alerts persisting for more than 60 minutes.
- [ ] Reminder runs occur at least hourly; no `crm.reminders.stale` error.
- [ ] Webhook deliveries: >= 99% HTTP 2xx over the window; failures appear only as
      `crm.alert.webhook` warnings.
- [ ] CRM 5xx rate < 1% of requests; no 401s on cron routes.

### First 7 days

- [ ] Daily review of alert trends; no day with more than 3 distinct `error`-level alert ids.
- [ ] Sync error count stays < 3 active connections for 7 consecutive days.
- [ ] Attachment storage reports `vercel-blob` on every day of the window.
- [ ] Cron schedule produces 96 health invocations/day (every 15 minutes) with no gaps > 30 minutes.
- [ ] Re-run `prisma migrate status` on day 7; still no pending migrations.

## 7. Rollback decisions

Thresholds are measured on the health JSON and Vercel request logs. Any single trigger below means
stop the rollout; two or more in the same 24h window means roll back the deployment.

- [ ] Any `error`-level alert present continuously for > 60 minutes.
- [ ] `crm.sync.errors` reports >= 3 failing connections for > 60 minutes.
- [ ] `crm.sync.stale` at error level while `counts.mailConnections > 0` for > 120 minutes.
- [ ] `crm.reminders.stale` at error level for > 360 minutes.
- [ ] CRM route 5xx rate > 5% over 30 minutes, or > 1% over 24 hours.
- [ ] Cron 401 rate > 0 for any 15-minute bucket (auth misconfiguration).
- [ ] Webhook 2xx rate < 95% over 60 minutes (alerting is effectively blind).
- [ ] Missing/new migration drift detected by `prisma migrate diff` (exit code != 0).

Rollback procedure:

1. Revert the application deployment to the previous Vercel deployment; do **not** roll back
   Postgres — migrations are forward-only.
2. Re-point DNS / re-enable the legacy write window per `docs/cutover-runbook.md` §5 if the CRM was
   part of the atomic cutover.
3. Keep the last known-good health JSON and cron logs attached to the incident ticket.
4. Re-run §3 and §4 gates before any re-attempt.

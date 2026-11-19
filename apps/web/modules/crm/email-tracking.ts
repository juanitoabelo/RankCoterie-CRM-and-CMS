import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { logAudit, type AuditAction } from "@/lib/audit";
import { enqueueCrmWebhook } from "@/lib/webhooks/dispatch";
import { prisma, TENANT_ID } from "@/modules/shared";

export const CRM_EMAIL_EVENT_TYPES = [
  "OPEN",
  "CLICK",
  "BOUNCE",
  "UNSUBSCRIBE",
  "FAILURE",
  "DELIVERED",
  "COMPLAINT",
  "SENT",
] as const;

export type EmailEventType = (typeof CRM_EMAIL_EVENT_TYPES)[number];

export function isEmailEventType(value: string): value is EmailEventType {
  return (CRM_EMAIL_EVENT_TYPES as readonly string[]).includes(value);
}

export function normalizeEmail(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/^mailto:/i, "")
    .replace(/^<?\s*/, "")
    .replace(/\s*>?$/, "");
}

export function generateTrackingToken(): string {
  return randomBytes(24).toString("base64url");
}

function signingSecret(): string {
  const secret = process.env.CRM_TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "CRM_TOKEN_ENCRYPTION_KEY or SESSION_SECRET is required to sign CRM email links.",
    );
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", signingSecret()).update(value).digest("hex");
}

export function signClickTarget(target: string, token: string): string {
  return hmac(`crm-email-click:${token}:${target}`);
}

export function verifyClickTarget(
  rawTarget: string | null | undefined,
  signature: string | null | undefined,
  token: string,
): string | null {
  if (!rawTarget || !signature) return null;
  let parsed: URL;
  try {
    parsed = new URL(rawTarget);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const expected = Buffer.from(signClickTarget(rawTarget, token));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;
  return rawTarget;
}

export function getEmailTrackingBaseUrl(): string {
  const configured =
    process.env.CRM_EMAIL_TRACKING_BASE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return configured.replace(/\/+$/, "");
}

export function buildOpenPixelUrl(token: string): string {
  return `${getEmailTrackingBaseUrl()}/api/crm/email/track/open/${encodeURIComponent(token)}`;
}

export function buildClickTrackingUrl(token: string, target: string): string {
  const url = new URL(`${getEmailTrackingBaseUrl()}/api/crm/email/track/click/${encodeURIComponent(token)}`);
  url.searchParams.set("target", target);
  url.searchParams.set("sig", signClickTarget(target, token));
  return url.toString();
}

export function buildUnsubscribeUrl(token: string): string {
  return `${getEmailTrackingBaseUrl()}/api/crm/email/unsubscribe/${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function rewriteTrackedLinks(html: string, token: string, unsubscribeUrl: string): string {
  return html.replace(
    /(href\s*=\s*)(["'])([^"']*)\2/gi,
    (match, prefix: string, quote: string, rawHref: string) => {
      const href = rawHref.replace(/&amp;/g, "&").trim();
      if (!/^https?:\/\//i.test(href)) return match;
      const lower = href.toLowerCase();
      if (
        lower.includes("/api/crm/email/unsubscribe/") ||
        lower.includes("/api/crm/email/track/") ||
        lower.startsWith(unsubscribeUrl.toLowerCase())
      ) {
        return match;
      }
      return `${prefix}${quote}${buildClickTrackingUrl(token, href)}${quote}`;
    },
  );
}

export type TrackedEmailInput = {
  body: string;
  htmlBody?: string | null;
  token: string;
  trackingEnabled?: boolean;
};

export type PreparedTrackedEmail = {
  body: string;
  htmlBody: string;
  unsubscribeUrl: string;
  openUrl: string;
};

export function prepareTrackedEmail(input: TrackedEmailInput): PreparedTrackedEmail {
  const unsubscribeUrl = buildUnsubscribeUrl(input.token);
  const openUrl = buildOpenPixelUrl(input.token);
  const trackingEnabled = input.trackingEnabled !== false;
  let html = input.htmlBody?.trim() ? input.htmlBody : textToHtml(input.body);
  if (trackingEnabled) html = rewriteTrackedLinks(html, input.token, unsubscribeUrl);

  if (!html.toLowerCase().includes(unsubscribeUrl.toLowerCase())) {
    const footer =
      `<p style="margin-top:24px;font-size:12px;color:#71717a;">` +
      `You received this email because you are a CRM contact. ` +
      `<a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`;
    html = /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${footer}</body>`) : html + footer;
  }

  if (trackingEnabled && !html.includes(`src="${openUrl}"`)) {
    const pixel = `<img src="${escapeHtml(openUrl)}" width="1" height="1" alt="" style="display:none" />`;
    html = /<\/body\s*>/i.test(html) ? html.replace(/<\/body\s*>/i, `${pixel}</body>`) : html + pixel;
  }

  return {
    body: `${input.body}\n\nUnsubscribe: ${unsubscribeUrl}`,
    htmlBody: html,
    unsubscribeUrl,
    openUrl,
  };
}

export async function isEmailSuppressed(
  email: string | null | undefined,
  tenantId = TENANT_ID,
): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const suppression = await prisma.crmEmailSuppression.findFirst({
    where: { tenantId, email: normalized, active: true },
    select: { id: true },
  });
  return Boolean(suppression);
}

export type EmailSuppressionInput = {
  email: string;
  reason: string;
  tenantId?: string;
  source?: string | null;
  messageId?: string | null;
  enrollmentId?: string | null;
  leadId?: string | null;
  clientId?: string | null;
};

export async function upsertEmailSuppression(input: EmailSuppressionInput) {
  const tenantId = input.tenantId ?? TENANT_ID;
  const email = normalizeEmail(input.email);
  const data = {
    tenantId,
    email,
    reason: input.reason,
    active: true,
    source: input.source ?? "email-tracking",
    messageId: input.messageId ?? null,
    enrollmentId: input.enrollmentId ?? null,
    leadId: input.leadId ?? null,
    clientId: input.clientId ?? null,
  };
  return prisma.crmEmailSuppression.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: data,
    update: {
      reason: data.reason,
      active: true,
      source: data.source,
      messageId: data.messageId,
      enrollmentId: data.enrollmentId,
      leadId: data.leadId,
      clientId: data.clientId,
    },
  });
}

export type EmailEventRecord = {
  type: EmailEventType;
  occurredAt: Date;
  recipient?: string | null;
  url?: string | null;
  providerEventId?: string | null;
  bounceType?: string | null;
  bounceReason?: string | null;
  failureCode?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type EmailEngagementSummary = {
  sentAt: Date | null;
  deliveredAt: Date | null;
  openCount: number;
  firstOpenedAt: Date | null;
  lastOpenedAt: Date | null;
  clickCount: number;
  firstClickedAt: Date | null;
  lastClickedAt: Date | null;
  bouncedAt: Date | null;
  bounceType: string | null;
  bounceReason: string | null;
  unsubscribedAt: Date | null;
  failedAt: Date | null;
  failureCode: string | null;
  status: string | null;
  appliedKeys?: string[];
};

export function emptyEmailEngagementSummary(): EmailEngagementSummary {
  return {
    sentAt: null,
    deliveredAt: null,
    openCount: 0,
    firstOpenedAt: null,
    lastOpenedAt: null,
    clickCount: 0,
    firstClickedAt: null,
    lastClickedAt: null,
    bouncedAt: null,
    bounceType: null,
    bounceReason: null,
    unsubscribedAt: null,
    failedAt: null,
    failureCode: null,
    status: null,
    appliedKeys: [],
  };
}

export function emailEventKey(event: EmailEventRecord): string {
  if (event.providerEventId) return `${event.type}:${event.providerEventId}`;
  const bucket = Math.floor(event.occurredAt.getTime() / 300_000);
  return `${event.type}:${normalizeEmail(event.recipient)}:${event.url ?? ""}:${bucket}`;
}

export function summarizeEmailEvents(
  events: readonly EmailEventRecord[],
  start: EmailEngagementSummary = emptyEmailEngagementSummary(),
): EmailEngagementSummary {
  const summary: EmailEngagementSummary = { ...start };
  const seen = new Set<string>(start.appliedKeys ?? []);
  const ordered = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  for (const event of ordered) {
    const key = emailEventKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    const at = event.occurredAt;
    switch (event.type) {
      case "OPEN":
        summary.openCount += 1;
        summary.firstOpenedAt ??= at;
        summary.lastOpenedAt = at;
        break;
      case "CLICK":
        summary.clickCount += 1;
        summary.firstClickedAt ??= at;
        summary.lastClickedAt = at;
        break;
      case "BOUNCE":
        summary.bouncedAt = at;
        summary.bounceType = event.bounceType ?? null;
        summary.bounceReason = event.bounceReason ?? null;
        break;
      case "UNSUBSCRIBE":
        summary.unsubscribedAt = at;
        break;
      case "FAILURE":
        summary.failedAt = at;
        summary.failureCode = event.failureCode ?? null;
        break;
      case "DELIVERED":
        summary.deliveredAt = at;
        break;
      case "SENT":
        summary.sentAt ??= at;
        break;
      case "COMPLAINT":
        summary.unsubscribedAt ??= at;
        break;
    }
  }
  summary.status = summary.failedAt
    ? "FAILED"
    : summary.bouncedAt
      ? "BOUNCED"
      : summary.unsubscribedAt
        ? "UNSUBSCRIBED"
        : summary.deliveredAt
          ? "DELIVERED"
          : summary.sentAt
            ? "SENT"
            : summary.status;
  summary.appliedKeys = [...seen];
  return summary;
}

const AUDIT_ACTIONS: Record<string, string> = {
  OPEN: "CRM_EMAIL_TRACK_OPEN",
  CLICK: "CRM_EMAIL_TRACK_CLICK",
  BOUNCE: "CRM_EMAIL_BOUNCE",
  UNSUBSCRIBE: "CRM_EMAIL_UNSUBSCRIBE",
  FAILURE: "CRM_EMAIL_FAILURE",
};

const WEBHOOK_EVENTS: Record<string, string> = {
  SENT: "email.sent",
  FAILURE: "email.failed",
  OPEN: "email.opened",
  CLICK: "email.clicked",
  BOUNCE: "email.bounced",
  UNSUBSCRIBE: "email.unsubscribed",
};

function summaryFromMessage(message: {
  sentAt: Date | null;
  deliveredAt: Date | null;
  openCount: number;
  firstOpenedAt: Date | null;
  lastOpenedAt: Date | null;
  clickCount: number;
  firstClickedAt: Date | null;
  lastClickedAt: Date | null;
  bouncedAt: Date | null;
  bounceType: string | null;
  bounceReason: string | null;
  unsubscribedAt: Date | null;
  failedAt: Date | null;
  failureCode: string | null;
  status: string;
}): EmailEngagementSummary {
  return { ...message, status: message.status };
}

function messageUpdate(summary: EmailEngagementSummary): Prisma.CrmEmailMessageUncheckedUpdateInput {
  return {
    status: summary.status ?? undefined,
    sentAt: summary.sentAt,
    deliveredAt: summary.deliveredAt,
    openCount: summary.openCount,
    firstOpenedAt: summary.firstOpenedAt,
    lastOpenedAt: summary.lastOpenedAt,
    clickCount: summary.clickCount,
    firstClickedAt: summary.firstClickedAt,
    lastClickedAt: summary.lastClickedAt,
    bouncedAt: summary.bouncedAt,
    bounceType: summary.bounceType,
    bounceReason: summary.bounceReason,
    unsubscribedAt: summary.unsubscribedAt,
    failedAt: summary.failedAt,
    failureCode: summary.failureCode,
  };
}

function eventFromRow(row: {
  type: string;
  occurredAt: Date;
  url: string | null;
  recipient: string | null;
  providerEventId: string | null;
  metadata: Prisma.JsonValue;
}): EmailEventRecord | null {
  if (!isEmailEventType(row.type)) return null;
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  return {
    type: row.type,
    occurredAt: row.occurredAt,
    url: row.url,
    recipient: row.recipient,
    providerEventId: row.providerEventId,
    bounceType: typeof metadata.bounceType === "string" ? metadata.bounceType : null,
    bounceReason: typeof metadata.bounceReason === "string" ? metadata.bounceReason : null,
    failureCode: typeof metadata.failureCode === "string" ? metadata.failureCode : null,
  };
}

export type RecordEmailEventInput = EmailEventRecord & {
  messageId: string;
  tenantId?: string;
  enrollmentId?: string | null;
  provider?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
};

export async function recordEmailEvent(
  input: RecordEmailEventInput,
): Promise<{ recorded: boolean; summary: EmailEngagementSummary }> {
  const tenantId = input.tenantId ?? TENANT_ID;
  const message = await prisma.crmEmailMessage.findFirst({
    where: { id: input.messageId, tenantId },
    select: {
      sentAt: true,
      deliveredAt: true,
      openCount: true,
      firstOpenedAt: true,
      lastOpenedAt: true,
      clickCount: true,
      firstClickedAt: true,
      lastClickedAt: true,
      bouncedAt: true,
      bounceType: true,
      bounceReason: true,
      unsubscribedAt: true,
      failedAt: true,
      failureCode: true,
      status: true,
      toEmail: true,
      enrollmentId: true,
      leadId: true,
      clientId: true,
    },
  });
  if (!message) return { recorded: false, summary: emptyEmailEngagementSummary() };

  const dedupeKey = emailEventKey(input);
  const existing = await prisma.crmEmailEvent.findFirst({
    where: { tenantId, messageId: input.messageId, providerEventId: dedupeKey },
    select: { id: true },
  });
  if (existing) return { recorded: false, summary: summaryFromMessage(message) };

  const metadata: Record<string, unknown> = { ...(input.metadata ?? {}) };
  if (input.bounceType) metadata.bounceType = input.bounceType;
  if (input.bounceReason) metadata.bounceReason = input.bounceReason;
  if (input.failureCode) metadata.failureCode = input.failureCode;
  if (input.providerEventId) metadata.providerEventId = input.providerEventId;

  await prisma.crmEmailEvent.create({
    data: {
      tenantId,
      messageId: input.messageId,
      enrollmentId: input.enrollmentId ?? message.enrollmentId,
      type: input.type,
      occurredAt: input.occurredAt,
      url: input.url ?? null,
      recipient: normalizeEmail(input.recipient ?? message.toEmail),
      provider: input.provider ?? null,
      providerEventId: dedupeKey,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent?.slice(0, 500) ?? null,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });

  const rows = await prisma.crmEmailEvent.findMany({
    where: { tenantId, messageId: input.messageId },
    orderBy: { occurredAt: "asc" },
    take: 1000,
    select: {
      type: true,
      occurredAt: true,
      url: true,
      recipient: true,
      providerEventId: true,
      metadata: true,
    },
  });
  const events = rows.map(eventFromRow).filter((row): row is EmailEventRecord => Boolean(row));
  const baseline = emptyEmailEngagementSummary();
  baseline.sentAt = message.sentAt;
  baseline.status = message.status;
  const summary = summarizeEmailEvents(events, baseline);
  await prisma.crmEmailMessage.update({
    where: { id: input.messageId },
    data: messageUpdate(summary),
  });

  if (input.type === "UNSUBSCRIBE" || input.type === "COMPLAINT") {
    await upsertEmailSuppression({
      tenantId,
      email: input.recipient ?? message.toEmail,
      reason: input.type === "COMPLAINT" ? "complaint" : "unsubscribe",
      source: "email-tracking",
      messageId: input.messageId,
      enrollmentId: message.enrollmentId,
      leadId: message.leadId,
      clientId: message.clientId,
    });
  }

  const payload = {
    messageId: input.messageId,
    tenantId,
    toEmail: normalizeEmail(input.recipient ?? message.toEmail),
    type: input.type,
    occurredAt: input.occurredAt.toISOString(),
    url: input.url ?? null,
    metadata,
  };
  const auditAction = AUDIT_ACTIONS[input.type];
  const webhookEvent = WEBHOOK_EVENTS[input.type];
  await Promise.allSettled([
    ...(auditAction
      ? [
          logAudit({
            action: auditAction as AuditAction,
            entity: "CrmEmailMessage",
            entityId: input.messageId,
            reason: `CRM email ${input.type.toLowerCase()} recorded`,
            meta: payload,
          }),
        ]
      : []),
    ...(webhookEvent
      ? [
          enqueueCrmWebhook(
            webhookEvent as Parameters<typeof enqueueCrmWebhook>[0],
            payload,
          ),
        ]
      : []),
  ]);

  return { recorded: true, summary };
}

type RecordEventInput = Omit<RecordEmailEventInput, "type" | "occurredAt"> & {
  occurredAt?: Date;
};

export function recordEmailOpen(input: RecordEventInput) {
  return recordEmailEvent({ ...input, type: "OPEN", occurredAt: input.occurredAt ?? new Date() });
}

export function recordEmailClick(input: RecordEventInput) {
  return recordEmailEvent({ ...input, type: "CLICK", occurredAt: input.occurredAt ?? new Date() });
}

export function recordEmailBounce(input: RecordEventInput) {
  return recordEmailEvent({ ...input, type: "BOUNCE", occurredAt: input.occurredAt ?? new Date() });
}

export function recordEmailUnsubscribe(input: RecordEventInput) {
  return recordEmailEvent({
    ...input,
    type: "UNSUBSCRIBE",
    occurredAt: input.occurredAt ?? new Date(),
  });
}

export function recordEmailFailure(input: RecordEventInput) {
  return recordEmailEvent({ ...input, type: "FAILURE", occurredAt: input.occurredAt ?? new Date() });
}

export function hashClientIp(value: string | null | undefined): string | null {
  const ip = value?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

export function requestClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || null;
}

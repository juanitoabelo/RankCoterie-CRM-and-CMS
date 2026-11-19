import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  emailEventKey,
  isEmailEventType,
  normalizeEmail,
  recordEmailEvent,
  type EmailEventType,
} from "@/modules/crm/email-tracking";
import { prisma, TENANT_ID } from "@/modules/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EVENT_ALIASES: Record<string, EmailEventType> = {
  delivered: "DELIVERED",
  delivery: "DELIVERED",
  "email.delivered": "DELIVERED",
  bounce: "BOUNCE",
  bounced: "BOUNCE",
  hard_bounce: "BOUNCE",
  soft_bounce: "BOUNCE",
  "email.bounced": "BOUNCE",
  failed: "FAILURE",
  failure: "FAILURE",
  delivery_failed: "FAILURE",
  send_failed: "FAILURE",
  "email.failed": "FAILURE",
  complaint: "COMPLAINT",
  spam_complaint: "COMPLAINT",
  unsubscribe: "UNSUBSCRIBE",
  unsubscribed: "UNSUBSCRIBE",
  open: "OPEN",
  opened: "OPEN",
  click: "CLICK",
  clicked: "CLICK",
  sent: "SENT",
};

type InboundEvent = {
  event?: string;
  type?: string;
  eventType?: string;
  provider?: string;
  providerEventId?: string;
  eventId?: string;
  id?: string;
  messageId?: string;
  providerMessageId?: string;
  recipient?: string;
  email?: string;
  to?: string;
  occurredAt?: string;
  timestamp?: string;
  bounceType?: string;
  bounceSubType?: string;
  reason?: string;
  bounceReason?: string;
  description?: string;
  failureCode?: string;
  code?: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

function authorized(request: Request): boolean {
  const secrets = [process.env.CRM_EMAIL_EVENTS_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  if (secrets.length === 0) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secrets.some(
    (secret) =>
      bearer === secret || request.headers.get("x-crm-email-events-secret") === secret,
  );
}

function resolveType(body: InboundEvent): EmailEventType | null {
  const raw = String(body.type ?? body.event ?? body.eventType ?? "").toLowerCase();
  if (EVENT_ALIASES[raw]) return EVENT_ALIASES[raw];
  const upper = raw.toUpperCase();
  return isEmailEventType(upper) ? upper : null;
}

function resolveDate(body: InboundEvent): Date {
  const raw = body.occurredAt ?? body.timestamp;
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const limited = rateLimit("crm-email-events:ingest", 600, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many events." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  let body: InboundEvent;
  try {
    body = (await request.json()) as InboundEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }
  const type = resolveType(body);
  if (!type) {
    return NextResponse.json({ error: "Unsupported event type." }, { status: 400 });
  }

  const providerEventId =
    body.providerEventId ??
    body.eventId ??
    body.id ??
    createHash("sha256").update(JSON.stringify(body)).digest("hex");
  const occurredAt = resolveDate(body);
  const recipient = normalizeEmail(body.recipient ?? body.email ?? body.to);
  const dedupeKey = emailEventKey({
    type,
    occurredAt,
    recipient,
    url: body.url ?? null,
    providerEventId,
  });
  const existing = await prisma.crmEmailEvent.findFirst({
    where: { tenantId: TENANT_ID, providerEventId: dedupeKey },
    select: { id: true },
  });
  if (existing) return NextResponse.json({ ok: true, duplicate: true, recorded: false });

  const where = body.providerMessageId
    ? { tenantId: TENANT_ID, providerMessageId: body.providerMessageId }
    : body.messageId
      ? { tenantId: TENANT_ID, id: body.messageId }
      : recipient
        ? { tenantId: TENANT_ID, toEmail: recipient }
        : null;
  if (!where) {
    return NextResponse.json({ ok: true, recorded: false, reason: "message not identified" });
  }
  const message = await prisma.crmEmailMessage.findFirst({
    where,
    select: { id: true, toEmail: true },
    orderBy: { createdAt: "desc" },
  });
  if (!message) {
    return NextResponse.json({ ok: true, recorded: false, reason: "message not found" });
  }

  const metadata = {
    ...(body.metadata ?? {}),
    ...(body.reason ? { reason: body.reason } : {}),
    ...(body.description ? { description: body.description } : {}),
  };
  const result = await recordEmailEvent({
    tenantId: TENANT_ID,
    messageId: message.id,
    type,
    occurredAt,
    provider: body.provider ?? null,
    providerEventId,
    recipient: recipient || message.toEmail,
    url: body.url ?? null,
    bounceType: body.bounceType ?? body.bounceSubType ?? null,
    bounceReason: body.bounceReason ?? body.reason ?? body.description ?? null,
    failureCode: body.failureCode ?? body.code ?? null,
    metadata,
  });
  return NextResponse.json({ ok: true, recorded: result.recorded, type });
}

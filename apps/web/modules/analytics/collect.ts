import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { ANALYTICS_EVENT_TYPES, MAX_EVENTS_PER_BATCH } from "./constants";
import { detectBot } from "@/lib/analytics/bots";
import { parseUserAgent } from "@/lib/analytics/ua";
import { geoFromHeaders } from "@/lib/analytics/geo";
import {
  cleanText,
  hashIp,
  inferContentType,
  isExcludedPath,
  normalizePath,
  sanitizeReferrer,
} from "@/lib/analytics/privacy";
import type { AnalyticsEventInput } from "./types";

type IngestContext = {
  headers: Headers;
  ip: string | null;
  excludedPaths?: string[];
};

function toDate(value: AnalyticsEventInput["occurredAt"]): Date {
  const now = Date.now();
  const parsed =
    value instanceof Date
      ? value.getTime()
      : typeof value === "number"
        ? value
        : typeof value === "string"
          ? new Date(value).getTime()
          : NaN;
  if (!Number.isFinite(parsed)) return new Date(now);
  return new Date(Math.min(Math.max(parsed, now - 10 * 60_000), now + 60_000));
}

function clampInt(value: unknown, min: number, max: number): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(Math.min(Math.max(parsed, min), max));
}

function metadataOf(input: AnalyticsEventInput): Prisma.InputJsonValue {
  if (!input.metadata || typeof input.metadata !== "object" || Array.isArray(input.metadata)) {
    return {};
  }
  const entries = Object.entries(input.metadata).slice(0, 30);
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of entries) {
    if (typeof value === "string") safe[key.slice(0, 60)] = value.slice(0, 500);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key.slice(0, 60)] = value;
    }
  }
  return safe;
}

export async function ingestAnalyticsBatch(
  input: AnalyticsEventInput[],
  context: IngestContext,
): Promise<number> {
  const events = Array.isArray(input) ? input.slice(0, MAX_EVENTS_PER_BATCH) : [];
  if (events.length === 0) return 0;

  const userAgent = context.headers.get("user-agent");
  const bot = detectBot(userAgent);
  const ua = parseUserAgent(userAgent);
  const geo = geoFromHeaders(context.headers);
  const ipHash = hashIp(context.ip);
  const host = context.headers.get("host");
  const now = new Date();

  const rows: Prisma.AnalyticsEventCreateManyInput[] = [];

  for (const event of events) {
    if (!event || typeof event !== "object") continue;

    const path = normalizePath(event.path);
    if (isExcludedPath(path, context.excludedPaths)) continue;

    const rawType = cleanText(event.eventType, 60) ?? "custom";
    const eventType = (ANALYTICS_EVENT_TYPES as readonly string[]).includes(rawType)
      ? rawType
      : "custom";

    const referrer = sanitizeReferrer(event.referrer ?? context.headers.get("referer"));
    const visitorId =
      cleanText(event.visitorId, 64) ?? ipHash ?? randomUUID();
    const sessionId = cleanText(event.sessionId, 64) ?? randomUUID();
    const metadata = metadataOf(event);

    rows.push({
      tenantId: TENANT_ID,
      eventId: cleanText(event.eventId, 64) ?? randomUUID(),
      eventType,
      sessionId,
      visitorId,
      path,
      host: cleanText(host, 255),
      title: cleanText(event.title, 500),
      contentType: cleanText(event.contentType, 60) ?? inferContentType(path),
      contentId: cleanText(event.contentId, 128),
      referrer: referrer.referrer,
      referrerHost: referrer.referrerHost,
      source: cleanText(event.source, 255) ?? referrer.source,
      medium: cleanText(event.medium, 120) ?? referrer.medium,
      campaign: cleanText(event.campaign, 255),
      term: cleanText(event.term, 255),
      content: cleanText(event.content, 255),
      country: geo.country,
      region: geo.region,
      city: geo.city,
      latitude: geo.latitude,
      longitude: geo.longitude,
      timezone: geo.timezone,
      deviceType: ua.deviceType,
      browser: ua.browser,
      os: ua.os,
      isBot: bot.isBot,
      botName: bot.botName,
      ipHash,
      durationMs: clampInt(event.durationMs, 0, 86_400_000),
      scrollDepth: clampInt(event.scrollDepth, 0, 100),
      metadata,
      occurredAt: toDate(event.occurredAt ?? now),
    });
  }

  if (rows.length === 0) return 0;

  try {
    const result = await prisma.analyticsEvent.createMany({
      data: rows,
      skipDuplicates: true,
    });
    return result.count;
  } catch (error) {
    console.error("[analytics] failed to ingest events", error);
    return 0;
  }
}

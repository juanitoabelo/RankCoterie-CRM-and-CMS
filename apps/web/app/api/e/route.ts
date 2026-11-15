import { after } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { getClientIp } from "@/lib/analytics/geo";
import { ingestAnalyticsBatch } from "@/modules/analytics/collect";
import { MAX_EVENT_BYTES, MAX_EVENTS_PER_BATCH } from "@/modules/analytics/constants";
import type { AnalyticsEventInput } from "@/modules/analytics/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noContent(): Response {
  return new Response(null, { status: 204 });
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(length) && length > MAX_EVENT_BYTES) {
    return new Response(null, { status: 413 });
  }

  const config = await getAnalyticsConfig();
  if (!config.enabled) return noContent();

  const ip = getClientIp(request.headers);
  const limited = rateLimit(`analytics:${ip ?? "unknown"}`, 180, 60_000);
  if (!limited.ok) {
    return new Response(null, {
      status: 429,
      headers: { "retry-after": String(limited.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_EVENT_BYTES) {
      return new Response(null, { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const rawEvents =
    body && typeof body === "object" && "events" in body
      ? (body as { events?: unknown }).events
      : body && typeof body === "object" && "event" in body
        ? [(body as { event?: unknown }).event]
        : [body];

  if (!Array.isArray(rawEvents)) return new Response(null, { status: 400 });
  const events = rawEvents
    .filter((event): event is AnalyticsEventInput => Boolean(event) && typeof event === "object")
    .slice(0, MAX_EVENTS_PER_BATCH);
  if (events.length === 0) return noContent();

  after(async () => {
    await ingestAnalyticsBatch(events, {
      headers: request.headers,
      ip,
      excludedPaths: config.excludedPaths,
    });
  });

  return noContent();
}

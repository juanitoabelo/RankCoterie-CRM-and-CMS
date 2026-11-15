"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_COLLECTOR_PATH, MAX_EVENTS_PER_BATCH } from "@/modules/analytics/constants";
import {
  ANALYTICS_EVENT_NAME,
  getSessionId,
  getVisitorId,
  markAnalyticsNotReady,
  markAnalyticsReady,
  readUtm,
} from "@/lib/analytics/client";
import { useAnalyticsConsent } from "@/lib/analytics/use-consent";

type TrackerEvent = {
  eventId: string;
  eventType: string;
  sessionId: string;
  visitorId?: string;
  path: string;
  title?: string;
  contentId?: string;
  referrer?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  durationMs?: number;
  scrollDepth?: number;
  metadata?: Record<string, unknown>;
  occurredAt: string;
};

type Props = {
  consentRequired?: boolean;
  excludedPaths?: string[];
  enabled?: boolean;
};

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isExcluded(path: string, excludedPaths: string[]): boolean {
  return excludedPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function contentIdFromDom(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const node = document.querySelector<HTMLElement>("[data-analytics-content-id]");
  return node?.dataset.analyticsContentId?.trim() || undefined;
}

function contentTypeFromDom(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const node = document.querySelector<HTMLElement>("[data-analytics-content-type]");
  return node?.dataset.analyticsContentType?.trim() || undefined;
}

function send(events: TrackerEvent[]): void {
  if (events.length === 0) return;
  const payload = JSON.stringify({ events });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(ANALYTICS_COLLECTOR_PATH, blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }
  void fetch(ANALYTICS_COLLECTOR_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export default function AnalyticsTracker({
  consentRequired = false,
  excludedPaths = [],
  enabled = true,
}: Props) {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  const queueRef = useRef<TrackerEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageStartRef = useRef<number>(0);
  const scrollDepthRef = useRef<number>(0);
  const lastPathRef = useRef<string>("");

  const allowed =
    enabled && (!consentRequired || consent === "granted") && !isExcluded(pathname || "/", excludedPaths);
  const allowedRef = useRef(allowed);
  allowedRef.current = allowed;

  const flush = useCallback(function flushQueue() {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const events = queueRef.current.splice(0, queueRef.current.length);
    send(events.slice(0, MAX_EVENTS_PER_BATCH));
    if (queueRef.current.length > 0) {
      flushTimerRef.current = setTimeout(flushQueue, 1000);
    }
  }, []);

  const enqueue = useCallback(
    (event: Omit<TrackerEvent, "eventId" | "sessionId" | "visitorId" | "occurredAt">) => {
      if (!allowed) return;
      queueRef.current.push({
        ...event,
        eventId: uuid(),
        sessionId: getSessionId(),
        visitorId: getVisitorId(),
        occurredAt: new Date().toISOString(),
      });
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flush, 1200);
      }
      if (queueRef.current.length >= MAX_EVENTS_PER_BATCH) flush();
    },
    [allowed, flush],
  );

  useEffect(() => {
    if (!allowed) return;
    const path = pathname || "/";
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;
    pageStartRef.current = performance.now();
    scrollDepthRef.current = 0;

    const utm = readUtm();
    const timer = setTimeout(() => {
      enqueue({
        eventType: "page_view",
        path,
        title: document.title,
        contentId: contentIdFromDom(),
        referrer: document.referrer || undefined,
        ...utm,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [allowed, enqueue, pathname]);

  useEffect(() => {
    if (!allowed) {
      markAnalyticsNotReady();
      return;
    }

    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const depth = Math.min(100, Math.round((window.scrollY / max) * 100));
      if (depth > scrollDepthRef.current) scrollDepthRef.current = depth;
    };

    const sendEngagement = () => {
      const durationMs = Math.round(performance.now() - pageStartRef.current);
      if (durationMs < 500 && scrollDepthRef.current === 0) return;
      enqueue({
        eventType: "engagement",
        path: lastPathRef.current || "/",
        durationMs,
        scrollDepth: scrollDepthRef.current,
      });
      pageStartRef.current = performance.now();
      scrollDepthRef.current = 0;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        sendEngagement();
        flush();
      }
    };

    const onPageHide = () => {
      sendEngagement();
      flush();
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const element = target?.closest<HTMLElement>("[data-analytics-event], a");
      if (!element) return;
      const anchor = element instanceof HTMLAnchorElement ? element : element.closest("a");
      const explicit = element.dataset.analyticsEvent;
      let eventType = explicit;
      const href = anchor?.getAttribute("href") ?? "";
      if (!eventType && anchor) {
        const resolved = anchor.href;
        if (resolved.startsWith("tel:")) eventType = "phone_click";
        else if (resolved.startsWith("mailto:")) eventType = "email_click";
        else if (/google\.[a-z.]+\/maps|maps\.google\./i.test(resolved)) eventType = "directions_click";
        else if (anchor.target === "_blank" || (resolved && !resolved.startsWith(window.location.origin))) {
          eventType = contentTypeFromDom() === "listing" ? "website_click" : "outbound_click";
        }
      }
      if (!eventType) return;
      enqueue({
        eventType,
        path: pathname || "/",
        title: document.title,
        contentId: element.dataset.analyticsContentId ?? contentIdFromDom(),
        metadata: {
          href: href.slice(0, 500),
          label: (element.textContent ?? "").trim().slice(0, 120),
        },
      });
      flush();
    };

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      if (!detail || typeof detail !== "object") return;
      const {
        eventType,
        path,
        title,
        contentId,
        durationMs,
        scrollDepth,
        metadata,
        ...rest
      } = detail as Record<string, unknown>;
      enqueue({
        eventType: typeof eventType === "string" ? eventType : "custom",
        path: typeof path === "string" ? path : pathname || "/",
        title: typeof title === "string" ? title : document.title,
        contentId: typeof contentId === "string" ? contentId : contentIdFromDom(),
        durationMs: typeof durationMs === "number" ? durationMs : undefined,
        scrollDepth: typeof scrollDepth === "number" ? scrollDepth : undefined,
        metadata:
          metadata && typeof metadata === "object" && !Array.isArray(metadata)
            ? (metadata as Record<string, unknown>)
            : rest,
      });
      flush();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, true);
    window.addEventListener(ANALYTICS_EVENT_NAME, onCustom);
    markAnalyticsReady();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(ANALYTICS_EVENT_NAME, onCustom);
      markAnalyticsNotReady();
      if (allowedRef.current) sendEngagement();
      flush();
    };
  }, [allowed, enqueue, flush, pathname]);

  return null;
}

"use client";

export const ANALYTICS_CONSENT_KEY = "rc_analytics_consent";
export const ANALYTICS_VISITOR_KEY = "rc_analytics_visitor";
export const ANALYTICS_SESSION_KEY = "rc_analytics_session";
export const ANALYTICS_EVENT_NAME = "rc:analytics";
export const ANALYTICS_CONSENT_EVENT = "rc:analytics-consent";

export type ConsentValue = "granted" | "denied";

function safeStorage(kind: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getConsent(): ConsentValue | null {
  if (typeof navigator !== "undefined") {
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;
    if (gpc || navigator.doNotTrack === "1" || navigator.doNotTrack === "yes") return "denied";
  }
  const value = safeStorage("local")?.getItem(ANALYTICS_CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : null;
}

export function setConsent(value: ConsentValue): void {
  safeStorage("local")?.setItem(ANALYTICS_CONSENT_KEY, value);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
  }
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

let memorySession: string | undefined;

export function getVisitorId(): string | undefined {
  const storage = safeStorage("local");
  if (!storage) return undefined;
  const existing = storage.getItem(ANALYTICS_VISITOR_KEY);
  if (existing) return existing;
  const next = uuid();
  storage.setItem(ANALYTICS_VISITOR_KEY, next);
  return next;
}

export function getSessionId(): string {
  const storage = safeStorage("session");
  if (!storage) {
    memorySession ??= uuid();
    return memorySession;
  }
  const existing = storage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) return existing;
  const next = uuid();
  storage.setItem(ANALYTICS_SESSION_KEY, next);
  return next;
}

type PendingTrackEvent = { eventType: string; properties: Record<string, unknown> };

const MAX_PENDING_EVENTS = 50;
const pendingEvents: PendingTrackEvent[] = [];
let analyticsReady = false;

function dispatchTrackEvent(eventType: string, properties: Record<string, unknown>): void {
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_EVENT_NAME, {
      detail: { eventType, ...properties },
    }),
  );
}

export function markAnalyticsReady(): void {
  if (typeof window === "undefined") return;
  analyticsReady = true;
  const queued = pendingEvents.splice(0, pendingEvents.length);
  for (const event of queued) dispatchTrackEvent(event.eventType, event.properties);
}

export function markAnalyticsNotReady(): void {
  analyticsReady = false;
  pendingEvents.length = 0;
}

export function trackEvent(
  eventType: string,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  if (!analyticsReady) {
    pendingEvents.push({ eventType, properties });
    if (pendingEvents.length > MAX_PENDING_EVENTS) pendingEvents.shift();
    return;
  }
  dispatchTrackEvent(eventType, properties);
}

export function readUtm(): {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
} {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const pick = (key: string) => params.get(key)?.trim() || undefined;
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    term: pick("utm_term"),
    content: pick("utm_content"),
  };
}

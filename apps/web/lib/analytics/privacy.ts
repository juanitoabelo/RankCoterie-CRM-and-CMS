import { createHash } from "node:crypto";
import { CONTENT_TYPE_PREFIXES, DEFAULT_EXCLUDED_PATHS } from "@/modules/analytics/constants";

const SEARCH_HOSTS: Record<string, string> = {
  "google.com": "google",
  "www.google.com": "google",
  "bing.com": "bing",
  "www.bing.com": "bing",
  "yahoo.com": "yahoo",
  "search.yahoo.com": "yahoo",
  "duckduckgo.com": "duckduckgo",
  "yandex.com": "yandex",
};

const SOCIAL_HOSTS = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "pinterest.com",
  "youtube.com",
  "reddit.com",
];

export function normalizePath(input: string | undefined | null): string {
  if (!input) return "/";
  let path = input.trim();
  if (!path.startsWith("/")) path = `/${path}`;
  const queryIndex = path.search(/[?#]/);
  if (queryIndex >= 0) path = path.slice(0, queryIndex);
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path.slice(0, 500) || "/";
}

export function isExcludedPath(path: string, excludedPaths: string[] = []): boolean {
  const list = [...DEFAULT_EXCLUDED_PATHS, ...excludedPaths];
  return list.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function inferContentType(path: string): string | null {
  const match = CONTENT_TYPE_PREFIXES.find(
    (entry) => path === entry.prefix.replace(/\/$/, "") || path.startsWith(entry.prefix),
  );
  return match?.contentType ?? null;
}

export function sanitizeReferrer(referrer: string | undefined | null): {
  referrer: string | null;
  referrerHost: string | null;
  source: string | null;
  medium: string | null;
} {
  if (!referrer) {
    return { referrer: null, referrerHost: null, source: null, medium: null };
  }
  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const searchSource = SEARCH_HOSTS[url.hostname.toLowerCase()] ?? SEARCH_HOSTS[host];
    const isSocial = SOCIAL_HOSTS.some((social) => host === social || host.endsWith(`.${social}`));
    return {
      referrer: `${url.origin}${url.pathname}`.slice(0, 500),
      referrerHost: host.slice(0, 255),
      source: searchSource ?? host.slice(0, 255),
      medium: searchSource ? "organic" : isSocial ? "social" : "referral",
    };
  } catch {
    return { referrer: null, referrerHost: null, source: null, medium: null };
  }
}

export function hashIp(ip: string | null | undefined, now = new Date()): string | null {
  if (!ip) return null;
  const salt = process.env.ANALYTICS_IP_SALT ?? "canopy-analytics";
  const day = now.toISOString().slice(0, 10);
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex").slice(0, 32);
}

export function cleanText(value: unknown, maxLength = 255): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ).slice(0, 100);
}

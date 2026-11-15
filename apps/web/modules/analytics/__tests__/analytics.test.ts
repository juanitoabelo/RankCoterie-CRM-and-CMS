import { describe, expect, it } from "vitest";
import { detectBot } from "@/lib/analytics/bots";
import { parseUserAgent } from "@/lib/analytics/ua";
import {
  inferContentType,
  isExcludedPath,
  normalizePath,
  parseStringArray,
  sanitizeReferrer,
} from "@/lib/analytics/privacy";
import { parseDays, resolveAnalyticsRange, dayKey } from "../range";
import { parseCompetitorProvider } from "../constants";

describe("normalizePath", () => {
  it("strips query strings and hashes", () => {
    expect(normalizePath("/listing/acme?utm_source=google#reviews")).toBe("/listing/acme");
  });

  it("removes trailing slashes and collapses duplicates", () => {
    expect(normalizePath("//listing//acme//")).toBe("/listing/acme");
  });

  it("defaults empty values to root", () => {
    expect(normalizePath("")).toBe("/");
    expect(normalizePath(null)).toBe("/");
  });
});

describe("isExcludedPath", () => {
  it("matches default prefixes", () => {
    expect(isExcludedPath("/admin/listings")).toBe(true);
    expect(isExcludedPath("/api/e")).toBe(true);
    expect(isExcludedPath("/listing/acme")).toBe(false);
  });

  it("matches configured prefixes", () => {
    expect(isExcludedPath("/account/settings", ["/account"])).toBe(true);
    expect(isExcludedPath("/accounts", ["/account"])).toBe(false);
  });
});

describe("inferContentType", () => {
  it("maps known prefixes", () => {
    expect(inferContentType("/listing/acme")).toBe("listing");
    expect(inferContentType("/g/texas/austin")).toBe("geo-category");
    expect(inferContentType("/search")).toBe("search");
  });

  it("returns null for unknown paths", () => {
    expect(inferContentType("/about")).toBeNull();
  });
});

describe("detectBot", () => {
  it("detects common crawlers", () => {
    expect(detectBot("Mozilla/5.0 (compatible; Googlebot/2.1)").isBot).toBe(true);
    expect(detectBot("GPTBot/1.0").botName).toBe("GPTBot");
  });

  it("treats missing UA as bot and normal browsers as human", () => {
    expect(detectBot(null).isBot).toBe(true);
    expect(detectBot("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36").isBot).toBe(false);
  });
});

describe("parseUserAgent", () => {
  it("parses mobile Chrome on Android", () => {
    const ua = parseUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
    expect(ua).toEqual({ deviceType: "mobile", browser: "Chrome", os: "Android" });
  });

  it("parses desktop Safari on macOS", () => {
    const ua = parseUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17 Safari/605.1.15");
    expect(ua).toEqual({ deviceType: "desktop", browser: "Safari", os: "macOS" });
  });
});

describe("sanitizeReferrer", () => {
  it("classifies search and social referrers", () => {
    expect(sanitizeReferrer("https://www.google.com/search?q=test")).toMatchObject({
      referrerHost: "google.com",
      source: "google",
      medium: "organic",
    });
    expect(sanitizeReferrer("https://www.linkedin.com/feed/")).toMatchObject({
      source: "linkedin.com",
      medium: "social",
    });
  });

  it("drops invalid referrers", () => {
    expect(sanitizeReferrer("not a url").referrer).toBeNull();
  });
});

describe("range helpers", () => {
  it("clamps day counts", () => {
    expect(parseDays("0")).toBe(1);
    expect(parseDays("9999")).toBe(365);
    expect(parseDays("nope", 14)).toBe(14);
  });

  it("builds inclusive UTC ranges", () => {
    const range = resolveAnalyticsRange(7);
    expect(range.days).toBe(7);
    expect(dayKey(range.from)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(range.to.getTime() - range.from.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(range.previousTo.getTime()).toBe(range.from.getTime());
  });
});

describe("parseStringArray", () => {
  it("dedupes and trims", () => {
    expect(parseStringArray([" a ", "a", "", 3, "b"])).toEqual(["a", "b"]);
  });
});

describe("parseCompetitorProvider", () => {
  it("accepts known providers", () => {
    expect(parseCompetitorProvider("searxng")).toBe("searxng");
    expect(parseCompetitorProvider("dataforseo")).toBe("dataforseo");
  });

  it("defaults unknown or missing providers to manual", () => {
    expect(parseCompetitorProvider("paid-api")).toBe("manual");
    expect(parseCompetitorProvider(null)).toBe("manual");
  });
});

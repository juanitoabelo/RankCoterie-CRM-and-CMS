export const ANALYTICS_EVENT_TYPES = [
  "page_view",
  "engagement",
  "search",
  "listing_view",
  "lead_submit",
  "phone_click",
  "email_click",
  "website_click",
  "directions_click",
  "outbound_click",
  "cta_click",
  "checkout_start",
  "checkout_success",
  "signup",
  "login",
  "custom",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export const CONVERSION_EVENTS = [
  "lead_submit",
  "phone_click",
  "email_click",
  "website_click",
  "directions_click",
  "checkout_start",
  "checkout_success",
  "signup",
] as const;

export const DEFAULT_EXCLUDED_PATHS = [
  "/admin",
  "/api",
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap",
];

export const MAX_EVENTS_PER_BATCH = 20;
export const MAX_EVENT_BYTES = 32 * 1024;
export const ANALYTICS_COLLECTOR_PATH = "/api/e";

export const BOT_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Googlebot", pattern: /googlebot/i },
  { name: "Google-InspectionTool", pattern: /google-inspectiontool/i },
  { name: "Bingbot", pattern: /bingbot/i },
  { name: "DuckDuckBot", pattern: /duckduckbot/i },
  { name: "Baiduspider", pattern: /baiduspider/i },
  { name: "YandexBot", pattern: /yandexbot/i },
  { name: "Applebot", pattern: /applebot/i },
  { name: "AhrefsBot", pattern: /ahrefsbot/i },
  { name: "SemrushBot", pattern: /semrushbot/i },
  { name: "MJ12bot", pattern: /mj12bot/i },
  { name: "PetalBot", pattern: /petalbot/i },
  { name: "FacebookBot", pattern: /facebookexternalhit/i },
  { name: "LinkedInBot", pattern: /linkedinbot/i },
  { name: "Twitterbot", pattern: /twitterbot/i },
  { name: "Slackbot", pattern: /slackbot/i },
  { name: "Discordbot", pattern: /discordbot/i },
  { name: "GPTBot", pattern: /gptbot/i },
  { name: "ClaudeBot", pattern: /claudebot/i },
  { name: "PerplexityBot", pattern: /perplexitybot/i },
  { name: "CommonCrawler", pattern: /ccbot/i },
  { name: "GenericBot", pattern: /bot\b|crawler|spider|preview/i },
];

export const CONTENT_TYPE_PREFIXES: Array<{ prefix: string; contentType: string }> = [
  { prefix: "/listing/", contentType: "listing" },
  { prefix: "/article/", contentType: "article" },
  { prefix: "/blog/", contentType: "article" },
  { prefix: "/g/", contentType: "geo-category" },
  { prefix: "/topic/", contentType: "topic" },
  { prefix: "/subtopic/", contentType: "subtopic" },
  { prefix: "/custom-post/", contentType: "custom-post" },
  { prefix: "/LandingPage/", contentType: "landing-page" },
  { prefix: "/company/", contentType: "company" },
  { prefix: "/search", contentType: "search" },
];

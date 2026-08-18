/**
 * Canopy V2 — feed parsing (legacy §4.3 feeds → FeedItem rows).
 *
 * Pure wrapper over rss-parser: normalizes RSS 2.0 + Atom into the shape
 * FeedItem rows need. No DB access — unit-testable with fixture XML.
 */
import Parser from "rss-parser";
import { createHash } from "node:crypto";

export interface FeedEntry {
  title: string;
  url: string | null;
  body: string | null;
  author: string | null;
  keywords: string | null;
  feedDate: Date | null;
  /** sha1 over title|url|feedDate — idempotency key for upserts. */
  fingerprint: string;
}

interface RssItem {
  title?: string;
  link?: string;
  contentSnippet?: string;
  content?: string;
  description?: string;
  summary?: string;
  creator?: string;
  author?: string;
  categories?: string[] | string;
  category?: string;
  isoDate?: string;
  pubDate?: string;
  [key: string]: unknown;
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function keywordsOf(item: RssItem): string | null {
  const parts: string[] = [];
  const cats = item.categories;
  if (Array.isArray(cats)) parts.push(...cats.filter(Boolean).map((c) => c.trim()));
  else if (typeof cats === "string" && cats.trim()) parts.push(cats.trim());
  if (typeof item.category === "string" && item.category.trim()) parts.push(item.category.trim());
  return parts.length ? parts.join(", ") : null;
}

function bodyOf(item: RssItem): string | null {
  const raw = item.contentSnippet ?? item.content ?? item.summary ?? item["content:encodedSnippet"] ?? item["content:encoded"] ?? item.description ?? null;
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  return trimmed || null;
}

export function fingerprintOf(title: string, url: string | null, feedDate: Date | null): string {
  const key = [title.trim().toLowerCase(), url?.trim() ?? "", feedDate?.getTime() ?? ""].join("|");
  return createHash("sha1").update(key).digest("hex");
}

export async function parseFeedXml(xml: string): Promise<FeedEntry[]> {
  const parser = new Parser();
  let feed: Parser.Output<RssItem>;
  try {
    feed = await parser.parseString(xml);
  } catch {
    return [];
  }

  const entries: FeedEntry[] = [];
  for (const item of feed.items ?? []) {
    const title = (item.title ?? "").trim();
    if (!title) continue; // skip items without a title — nothing to curate

    const url = item.link?.trim() || null;
    const body = bodyOf(item);
    const author = item.creator?.trim() || item.author?.trim() || null;
    const keywords = keywordsOf(item);
    const feedDate = parseDate(item.isoDate) ?? parseDate(item.pubDate);

    entries.push({
      title,
      url,
      body,
      author,
      keywords,
      feedDate,
      fingerprint: fingerprintOf(title, url, feedDate),
    });
  }
  return entries;
}

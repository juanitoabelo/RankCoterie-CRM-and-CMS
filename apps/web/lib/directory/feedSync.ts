/**
 * Canopy V2 — feed ingestion (legacy §4.3).
 *
 * Fetches ACTIVE feeds, parses RSS/Atom, upserts FeedItems idempotently
 * (fingerprint unique constraint — re-syncing a feed never duplicates rows),
 * and records lastFetchedAt/lastError on the Feed row.
 *
 * Called by the Inngest feed-sync job (scheduled cron) and by the admin
 * "Sync now" server action.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { parseFeedXml, type FeedEntry } from "@/lib/directory/feedParser";

export const FEED_FETCH_TIMEOUT_MS = 15_000;

export interface FeedSyncResult {
  feedId: string;
  fetchedAt: Date;
  itemsSeen: number;
  itemsCreated: number;
  error: string | null;
}

async function fetchFeedXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "canopy-v2-feed-sync/0.1" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function syncFeed(feedId: string): Promise<FeedSyncResult> {
  const feed = await prisma.feed.findUnique({ where: { id: feedId } });
  if (!feed) throw new Error(`Feed not found: ${feedId}`);
  if (!feed.url) throw new Error(`Feed ${feed.name} has no URL — nothing to sync`);
  if (feed.status !== "ACTIVE") throw new Error(`Feed ${feed.name} is INACTIVE`);

  const fetchedAt = new Date();
  try {
    const xml = await fetchFeedXml(feed.url);
    const entries = await parseFeedXml(xml);

    const existing = new Set(
      (await prisma.feedItem.findMany({ where: { feedId }, select: { fingerprint: true } })).map(
        (i) => i.fingerprint,
      ),
    );
    const fresh = entries.filter((e) => !existing.has(e.fingerprint));

    await prisma.$transaction([
      prisma.feedItem.createMany({
        data: fresh.map((e: FeedEntry) => ({
          feedId,
          fingerprint: e.fingerprint,
          title: e.title,
          url: e.url,
          body: e.body,
          author: e.author,
          keywords: e.keywords,
          feedDate: e.feedDate,
        })),
      }),
      prisma.feed.update({
        where: { id: feedId },
        data: { lastFetchedAt: fetchedAt, lastError: null },
      }),
    ]);

    return { feedId, fetchedAt, itemsSeen: entries.length, itemsCreated: fresh.length, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.feed.update({ where: { id: feedId }, data: { lastError: message } });
    return { feedId, fetchedAt, itemsSeen: 0, itemsCreated: 0, error: message };
  }
}

export async function syncAllFeeds(): Promise<FeedSyncResult[]> {
  const feeds = await prisma.feed.findMany({ where: { status: "ACTIVE", url: { not: null } } });
  return Promise.all(feeds.map((f) => syncFeed(f.id)));
}

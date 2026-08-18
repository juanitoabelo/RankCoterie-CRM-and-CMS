/**
 * Canopy V2 — Inngest jobs: feed ingestion cron (legacy §4.3).
 *
 * - feedSyncAllJob: scheduled every 6h (FEED_SYNC_CRON env overrides) + feed/sync.all event
 * - feedSyncOneJob: on-demand single feed (feed/sync.one, {feedId}) — the admin
 *   "Sync now" action also syncs inline for instant UX, so this is belt & braces.
 */
import { inngest } from "./index";
import { syncAllFeeds, syncFeed } from "web/lib/directory/feedSync";

export const FEED_SYNC_ALL_EVENT = "feed/sync.all";
export const FEED_SYNC_ONE_EVENT = "feed/sync.one";

export const feedSyncAllJob = inngest.createFunction(
  {
    id: "feed-sync",
    triggers: [
      { event: FEED_SYNC_ALL_EVENT },
      { cron: process.env.FEED_SYNC_CRON ?? "0 */6 * * *" },
    ],
  },
  async ({ step }) => {
    const results = await step.run("sync-all-feeds", () => syncAllFeeds());
    const failed = results.filter((r) => r.error);
    return { synced: results, failed: failed.length };
  },
);

export const feedSyncOneJob = inngest.createFunction(
  {
    id: "feed-sync-one",
    triggers: [{ event: FEED_SYNC_ONE_EVENT }],
  },
  async ({ event, step }) => {
    const feedId = (event.data as { feedId?: string } | undefined)?.feedId;
    if (!feedId) return { synced: null };
    const result = await step.run("sync-one-feed", () => syncFeed(feedId));
    return { synced: result, failed: result.error ? 1 : 0 };
  },
);
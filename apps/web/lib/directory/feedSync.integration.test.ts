import { describe, expect, it, vi, afterEach } from "vitest";
import { prisma } from "./prismaCatalog";
import { syncFeed } from "./feedSync";

// Integration test — needs a seeded Postgres (packages/db: db:deploy + db:seed).
// Gated behind CANOPY_INTEGRATION=1 so the default unit suite stays DB-free.
const run = process.env.CANOPY_INTEGRATION === "1" ? describe : describe.skip;

const RSS_FIXTURE = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>T</title>
<item><title>Item one</title><link>https://x.com/1</link></item>
<item><title>Item two</title><link>https://x.com/2</link></item>
</channel></rss>`;

run("feedSync against seeded canopy_dev", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.feedItem.deleteMany({ where: { feedId: "feed-sync-test" } });
    await prisma.feed.deleteMany({ where: { id: "feed-sync-test" } });
  });

  it("ingests feed items idempotently (second sync creates zero rows)", async () => {
    await prisma.feed.create({
      data: {
        id: "feed-sync-test",
        tenantId: "tenant-masternet",
        name: "Sync test feed",
        url: "https://x.com/feed.xml",
        type: "RSS",
        status: "ACTIVE",
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(RSS_FIXTURE, { status: 200 })),
    );

    const first = await syncFeed("feed-sync-test");
    expect(first.itemsSeen).toBe(2);
    expect(first.itemsCreated).toBe(2);
    expect(first.error).toBeNull();

    const second = await syncFeed("feed-sync-test");
    expect(second.itemsSeen).toBe(2);
    expect(second.itemsCreated).toBe(0);

    const count = await prisma.feedItem.count({ where: { feedId: "feed-sync-test" } });
    expect(count).toBe(2);

    const feed = await prisma.feed.findUnique({ where: { id: "feed-sync-test" } });
    expect(feed?.lastFetchedAt).not.toBeNull();
    expect(feed?.lastError).toBeNull();
  });

  it("records lastError and leaves state clean when fetch fails", async () => {
    await prisma.feed.create({
      data: {
        id: "feed-sync-test",
        tenantId: "tenant-masternet",
        name: "Sync test feed",
        url: "https://x.com/feed.xml",
        type: "RSS",
        status: "ACTIVE",
      },
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );

    const result = await syncFeed("feed-sync-test");
    expect(result.error).toContain("HTTP 500");

    const feed = await prisma.feed.findUnique({ where: { id: "feed-sync-test" } });
    expect(feed?.lastError).toContain("HTTP 500");
    expect(await prisma.feedItem.count({ where: { feedId: "feed-sync-test" } })).toBe(0);
  });
});
import { prisma } from "@/lib/directory/prismaCatalog";
import { addFeedForm, toggleForm, syncNowForm } from "./actions";

export default async function FeedsPage() {
  const feeds = await prisma.feed.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  const pendingByFeed = new Map<string, number>();
  for (const feed of feeds) {
    const pending = await prisma.feedItem.count({
      where: { feedId: feed.id, status: "NEW" },
    });
    pendingByFeed.set(feed.id, pending);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-semibold text-zinc-900">Feeds</h1>
      <p className="mt-1 text-sm text-zinc-600">
        RSS/Atom ingestion sources. Approved items become SearchArticle rows.
      </p>

      <form action={addFeedForm} className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-medium text-zinc-900">Add feed</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input
            name="name"
            required
            placeholder="Feed name (e.g. SAMHSA news)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="url"
            required
            type="url"
            placeholder="https://example.com/feed.xml"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <select name="type" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="RSS">RSS</option>
            <option value="ATOM">Atom</option>
          </select>
          <select name="status" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="INACTIVE">Inactive</option>
            <option value="ACTIVE">Active (cron will fetch)</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Add feed
          </button>
        </div>
      </form>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">URL</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Pending</th>
            <th className="py-2 pr-4">Items</th>
            <th className="py-2 pr-4">Last fetch</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {feeds.map((feed) => {
            const pending = pendingByFeed.get(feed.id) ?? 0;
            return (
              <tr key={feed.id} className="border-b border-zinc-100">
                <td className="py-2 pr-4">
                  <a
                    href={`/admin/feeds/${feed.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {feed.name}
                  </a>
                </td>
                <td className="max-w-[220px] truncate py-2 pr-4 text-zinc-600">{feed.url ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      feed.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {feed.status}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  {pending > 0 ? (
                    <span className="font-semibold text-amber-600">{pending}</span>
                  ) : (
                    <span className="text-zinc-400">0</span>
                  )}
                </td>
                <td className="py-2 pr-4 text-zinc-600">{feed._count.items}</td>
                <td className="py-2 pr-4 text-xs text-zinc-500">
                  {feed.lastFetchedAt?.toLocaleString() ?? "never"}
                  {feed.lastError && (
                    <span className="block max-w-[200px] truncate text-red-500">
                      ⚠ {feed.lastError}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <form action={toggleForm} className="inline">
                    <input type="hidden" name="feedId" value={feed.id} />
                    <input
                      type="hidden"
                      name="activate"
                      value={feed.status === "ACTIVE" ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
                    >
                      {feed.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <form action={syncNowForm} className="ml-3 inline">
                    <input type="hidden" name="feedId" value={feed.id} />
                    <button
                      type="submit"
                      disabled={feed.status !== "ACTIVE" || !feed.url}
                      className="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sync now
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {feeds.length === 0 && (
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm text-zinc-400">
                No feeds yet — add one above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
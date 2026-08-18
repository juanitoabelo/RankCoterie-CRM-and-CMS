import { prisma } from "@/lib/directory/prismaCatalog";
import { approveForm, trashForm } from "../actions";

export default async function FeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const feed = await prisma.feed.findUnique({
    where: { id },
    include: {
      items: { orderBy: { createdAt: "desc" }, take: 200 },
    },
  });
  if (!feed) return <p className="text-sm text-zinc-500">Feed not found.</p>;

  const newItems = feed.items.filter((i) => i.status === "NEW");
  const curated = feed.items.filter((i) => i.status !== "NEW");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">{feed.name}</h1>
        <span className="text-xs text-zinc-500">{feed.url}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        {feed.type} · {feed.status} · last fetched{" "}
        {feed.lastFetchedAt?.toLocaleString() ?? "never"}
        {feed.lastError && <span className="text-red-500"> · ⚠ {feed.lastError}</span>}
      </p>

      <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-zinc-500">
        Pending review ({newItems.length})
      </h2>
      <ul className="mt-3 space-y-3">
        {newItems.map((item) => (
          <li key={item.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="font-medium text-zinc-900">{item.title}</p>
            {item.body && <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{item.body}</p>}
            <p className="mt-2 text-xs text-zinc-400">
              {item.author ?? "no author"} · {item.feedDate?.toLocaleDateString() ?? "no date"}
              {item.keywords && <span> · {item.keywords}</span>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noreferrer" className="ml-2 underline">
                  source
                </a>
              )}
            </p>
            <div className="mt-3 flex gap-2">
              <form action={approveForm}>
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Approve → article
                </button>
              </form>
              <form action={trashForm}>
                <input type="hidden" name="itemId" value={item.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Trash
                </button>
              </form>
            </div>
          </li>
        ))}
        {newItems.length === 0 && (
          <li className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
            Nothing pending — sync this feed or wait for the cron.
          </li>
        )}
      </ul>

      {curated.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-medium uppercase tracking-wide text-zinc-500">
            Curated ({curated.length})
          </h2>
          <ul className="mt-3 space-y-1.5">
            {curated.map((item) => (
              <li key={item.id} className="flex items-baseline gap-2 text-sm">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    item.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {item.status}
                </span>
                <span className="text-zinc-700">{item.title}</span>
                {item.curatedAt && (
                  <span className="text-xs text-zinc-400">{item.curatedAt.toLocaleDateString()}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
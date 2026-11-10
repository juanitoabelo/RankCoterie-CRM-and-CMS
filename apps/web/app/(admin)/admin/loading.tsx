import RouteProgressBar from "@/components/admin/RouteProgressBar";

/**
 * Admin route-level loading state. Shown while any admin navigation (page
 * switch, pagination, sort, search, filter) is streaming in, so the user can
 * see the dashboard is still working instead of a frozen screen.
 */
export default function AdminLoading() {
  return (
    <>
      <RouteProgressBar />
      <div className="animate-pulse" aria-hidden="true">
        <div className="h-4 w-48 rounded bg-zinc-200" />
        <div className="mt-3 h-8 w-64 rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-96 max-w-full rounded bg-zinc-100" />

        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="h-4 w-32 rounded bg-zinc-200" />
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="h-9 min-w-56 flex-1 rounded-lg bg-zinc-100" />
            <div className="h-9 w-28 rounded-lg bg-zinc-900/80" />
          </div>
        </div>

        <div className="mt-4 h-4 w-56 rounded bg-zinc-100" />

        <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <div className="flex gap-6">
                    {[48, 72, 44, 56, 40].map((width, i) => (
                      <div
                        key={i}
                        className="h-3 rounded bg-zinc-200"
                        style={{ width }}
                      />
                    ))}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Array.from({ length: 8 }).map((_, row) => (
                <tr key={row}>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-6">
                      {[120, 80, 56, 64, 48].map((width, i) => (
                        <div
                          key={i}
                          className="h-3.5 rounded bg-zinc-100"
                          style={{ width: width + ((row * 7 + i * 13) % 40) }}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 h-8 w-72 rounded bg-zinc-100" />
      </div>
      <span className="sr-only">Loading…</span>
    </>
  );
}

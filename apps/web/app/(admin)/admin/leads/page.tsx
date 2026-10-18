/**
 * Admin Leads Page
 * 
 * Uses the Leads module for all lead-related functionality.
 */
import Link from "next/link";
import { getLeads, getLeadStatsInRange, LEAD_STATUS_BADGE } from "@/modules/leads";
import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Leads | Admin" };

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string; from?: string; to?: string; error?: string; ok?: string }>;
}) {
  await requireSection("leads");
  const { q, status, page: pageParam, from, to, error, ok } = await searchParams;
  const query = q?.trim() || "";
  const statusFilter = ["NEW", "OPEN", "CLOSED", "ARCHIVED"].includes(status ?? "")
    ? (status as "NEW" | "OPEN" | "CLOSED" | "ARCHIVED" | "ALL")
    : "ALL";
  const page = parseInt(pageParam ?? "1", 10) || 1;
  const fromFilter = from?.trim() || undefined;
  const toFilter = to?.trim() || undefined;

  const [{ items: leads, total, totalPages }, counts] = await Promise.all([
    getLeads({
      search: query,
      status: statusFilter,
      page,
      pageSize: 50,
      from: fromFilter,
      to: toFilter,
    }),
    getLeadStatsInRange(fromFilter, toFilter),
  ]);
  
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const rangeTotal = counts.reduce((sum, c) => sum + c._count._all, 0);
  const hasRange = Boolean(fromFilter || toFilter);

  const pageHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      q: query || undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
      from: fromFilter,
      to: toFilter,
      page: undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const s = params.toString();
    return s ? `/admin/leads?${s}` : "/admin/leads";
  };

  const exportHref = `/admin/leads/export?${new URLSearchParams(
    Object.fromEntries(
      Object.entries({
        q: query || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        from: fromFilter,
        to: toFilter,
      }).filter(([, v]) => Boolean(v)) as [string, string][],
    ),
  ).toString()}`;

  return (
    <div>
      <FlashBanner error={error} ok={ok} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {hasRange ? `${rangeTotal} in range · ` : ""}
            {total} shown ·{" "}
            {Object.entries(countByStatus)
              .map(([s, n]) => `${s}: ${n}`)
              .join(" · ")}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Link
            href="/admin/leads/new"
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            Add New Lead
          </Link>
          <Link
            href={exportHref}
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Export CSV
          </Link>
          <form method="get" className="flex flex-wrap items-end gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name or email…"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <select
            name="status"
            defaultValue={statusFilter === "ALL" ? "" : statusFilter}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {Object.keys(LEAD_STATUS_BADGE).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="block text-xs text-zinc-500">
            Created from
            <input
              type="date"
              name="from"
              defaultValue={fromFilter ?? ""}
              className="mt-0.5 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            To
            <input
              type="date"
              name="to"
              defaultValue={toFilter ?? ""}
              className="mt-0.5 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
            Filter
          </button>
          </form>
        </div>
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Lead</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Disposition</th>
            <th className="py-2 pr-4">Campaign</th>
            <th className="py-2 pr-4">Source</th>
            <th className="py-2 pr-4">Notes/Todos</th>
            <th className="py-2 pr-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-zinc-50">
              <td className="py-3 pr-4">
                <Link href={`/admin/leads/${lead.id}`} className="font-medium text-zinc-900 hover:underline">
                  {lead.firstName} {lead.lastName}
                </Link>
                {lead.email && <p className="text-xs text-zinc-400">{lead.email}</p>}
              </td>
              <td className="py-3 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_BADGE[lead.status as keyof typeof LEAD_STATUS_BADGE] ?? "bg-zinc-100 text-zinc-500"}`}>
                  {lead.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-zinc-600">{lead.disposition ?? "—"}</td>
              <td className="py-3 pr-4 text-zinc-600">{lead.campaignId ?? "—"}</td>
              <td className="py-3 pr-4 text-zinc-600">
                <span className="text-xs text-zinc-400">
                  {lead.landingPageId ?? lead.publisherId ?? "direct"}
                </span>
              </td>
              <td className="py-3 pr-4 text-zinc-500">
                {lead.notes.length} notes · {lead.todos.filter((t) => !t.finishedAt).length} open todos
              </td>
              <td className="py-3 pr-4 text-zinc-500">
                {lead.createdAt.toISOString().slice(0, 10)}
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={7} className="py-10 text-center text-sm text-zinc-400">
                No leads match these filters.{" "}
                <Link href="/admin/leads/new" className="text-zinc-600 underline hover:text-zinc-900">
                  Add the first lead
                </Link>
                .
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={pageHref({ page: String(page - 1) })}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={pageHref({ page: String(page + 1) })}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

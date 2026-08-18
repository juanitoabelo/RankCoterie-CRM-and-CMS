import Link from "next/link";
import { prisma } from "@/lib/directory/prismaCatalog";
import { leadStatusForm } from "./actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Leads | Admin" };

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const query = q?.trim() || "";
  const statusFilter = ["NEW", "OPEN", "CLOSED", "ARCHIVED"].includes(status ?? "")
    ? status
    : undefined;

  const where = {
    tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet",
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [leads, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { notes: true, todos: true },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  const statusBadge: Record<string, string> = {
    NEW: "bg-blue-50 text-blue-700",
    OPEN: "bg-amber-50 text-amber-700",
    CLOSED: "bg-emerald-50 text-emerald-700",
    ARCHIVED: "bg-zinc-100 text-zinc-500",
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {leads.length} shown ·{" "}
            {Object.entries(countByStatus)
              .map(([s, n]) => `${s}: ${n}`)
              .join(" · ")}
          </p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name or email…"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {Object.keys(statusBadge).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
            Filter
          </button>
        </form>
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
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[lead.status] ?? "bg-zinc-100 text-zinc-500"}`}>
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
        </tbody>
      </table>
    </div>
  );
}

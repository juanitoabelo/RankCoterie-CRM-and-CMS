import Link from "next/link";
import { Prisma } from "@prisma/client";
import { getClients } from "@/modules/billing";
import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Clients | Admin" };

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    partial?: string;
    recurring?: string;
    from?: string;
    to?: string;
    error?: string;
    ok?: string;
  }>;
}) {
  await requireSection("clients");
  const { q, page: pageParam, partial, recurring, from, to, error, ok } = await searchParams;
  const query = q?.trim() || "";
  const page = parseInt(pageParam ?? "1", 10) || 1;
  const partialOnly = partial === "1";
  const recurringOnly = recurring === "1";
  const fromFilter = from?.trim() || undefined;
  const toFilter = to?.trim() || undefined;

  const { items: clients, total, totalPages } = await getClients({
    search: query,
    partial: partialOnly || undefined,
    recurring: recurringOnly || undefined,
    from: fromFilter,
    to: toFilter,
    page,
    pageSize: 50,
  });

  const pageHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = {
      q: query || undefined,
      partial: partialOnly ? "1" : undefined,
      recurring: recurringOnly ? "1" : undefined,
      from: fromFilter,
      to: toFilter,
      page: undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    const s = params.toString();
    return s ? `/admin/clients?${s}` : "/admin/clients";
  };

  const exportHref = `/api/admin/exports?kind=clients${query ? `&q=${encodeURIComponent(query)}` : ""}`;

  return (
    <div>
      <FlashBanner error={error} ok={ok} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} total · page {page} of {Math.max(totalPages, 1)}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Link
            href="/admin/clients/new"
            className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700"
          >
            Add Client
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
            <label className="flex items-center gap-1 pb-1.5 text-sm text-zinc-600">
              <input type="checkbox" name="partial" value="1" defaultChecked={partialOnly} className="rounded border-zinc-300" />
              Partial
            </label>
            <label className="flex items-center gap-1 pb-1.5 text-sm text-zinc-600">
              <input type="checkbox" name="recurring" value="1" defaultChecked={recurringOnly} className="rounded border-zinc-300" />
              Recurring
            </label>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Filter</button>
          </form>
        </div>
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Client</th>
            <th className="py-2 pr-4">Card</th>
            <th className="py-2 pr-4">Invoices</th>
            <th className="py-2 pr-4">Total billed</th>
            <th className="py-2 pr-4">Outstanding (ATTEMPTED)</th>
            <th className="py-2 pr-4">Recurring</th>
            <th className="py-2 pr-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {clients.map((client) => {
            const invoices = client.invoices ?? [];
            const billed = invoices
              .filter((i) => i.status === "APPROVED")
              .reduce((sum, i) => sum.add(i.amount as Prisma.Decimal), new Prisma.Decimal(0));
            const outstanding = invoices
              .filter((i) => i.status === "ATTEMPTED")
              .reduce((sum, i) => sum.add(i.amount as Prisma.Decimal), new Prisma.Decimal(0));
            return (
              <tr key={client.id} className="hover:bg-zinc-50">
                <td className="py-3 pr-4">
                  <Link href={`/admin/clients/${client.id}`} className="font-medium text-zinc-900 hover:underline">
                    {client.firstName} {client.lastName}
                  </Link>
                  {client.email && <p className="text-xs text-zinc-400">{client.email}</p>}
                  {client.isPartial && (
                    <span className="mt-1 inline-block rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                      partial
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 font-mono text-zinc-600">{client.maskedCard ?? "—"}</td>
                <td className="py-3 pr-4 text-zinc-600">{invoices.length}</td>
                <td className="py-3 pr-4 text-zinc-900">${billed.toFixed(2)}</td>
                <td className="py-3 pr-4 text-amber-700">${outstanding.toFixed(2)}</td>
                <td className="py-3 pr-4 text-zinc-600">
                  {invoices.some((i) => i.isRecurring) ? "yes" : "no"}
                </td>
                <td className="py-3 pr-4 text-zinc-500">{client.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            );
          })}
          {clients.length === 0 && (
            <tr>
              <td colSpan={7} className="py-10 text-center text-sm text-zinc-400">
                No clients match these filters.{" "}
                <Link href="/admin/clients/new" className="text-zinc-600 underline hover:text-zinc-900">
                  Add the first client
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

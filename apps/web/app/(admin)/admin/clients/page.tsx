import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Clients | Admin" };

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  const where = {
    tenantId: TENANT_ID,
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

  const clients = await prisma.client.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { invoices: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500">{clients.length} shown</p>
        </div>
        <form method="get" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name or email…"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Filter</button>
        </form>
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
            const billed = client.invoices
              .filter((i) => i.status === "APPROVED")
              .reduce((sum, i) => sum.add(i.amount), new Prisma.Decimal(0));
            const outstanding = client.invoices
              .filter((i) => i.status === "ATTEMPTED")
              .reduce((sum, i) => sum.add(i.amount), new Prisma.Decimal(0));
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
                <td className="py-3 pr-4 font-mono text-zinc-600">****{client.maskedCard ?? "—"}</td>
                <td className="py-3 pr-4 text-zinc-600">{client.invoices.length}</td>
                <td className="py-3 pr-4 text-zinc-900">${billed.toFixed(2)}</td>
                <td className="py-3 pr-4 text-amber-700">${outstanding.toFixed(2)}</td>
                <td className="py-3 pr-4 text-zinc-600">
                  {client.invoices.some((i) => i.isRecurring) ? "yes" : "no"}
                </td>
                <td className="py-3 pr-4 text-zinc-500">{client.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

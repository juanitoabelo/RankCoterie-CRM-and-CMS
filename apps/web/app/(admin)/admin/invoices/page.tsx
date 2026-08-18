import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { invoiceStatusForm } from "./actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Invoices | Admin" };

const statusBadge: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  ATTEMPTED: "bg-amber-50 text-amber-700",
  DECLINED: "bg-red-50 text-red-700",
  ERROR: "bg-zinc-100 text-zinc-600",
  REFUNDED: "bg-sky-50 text-sky-700",
  CHARGEDBACK: "bg-purple-50 text-purple-700",
};

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusFilter = Object.keys(statusBadge).includes(status ?? "") ? status : undefined;

  const invoices = await prisma.invoice.findMany({
    where: statusFilter ? { status: statusFilter } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { client: true },
  });

  const totals = await prisma.invoice.groupBy({ by: ["status"], _sum: { amount: true }, _count: { _all: true } });
  const sumByStatus = Object.fromEntries(totals.map((t) => [t.status, { sum: t._sum.amount ?? new Prisma.Decimal(0), count: t._count._all }]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Invoices</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {Object.keys(sumByStatus).map((s) => {
              const { sum, count } = sumByStatus[s];
              return `${s}: ${count} ($${sum.toFixed(0)})`;
            }).join(" · ")}
          </p>
        </div>
        <form method="get" className="flex gap-2">
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {Object.keys(statusBadge).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Filter</button>
        </form>
      </div>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2 pr-4">Client</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Charged</th>
            <th className="py-2 pr-4">Recurring</th>
            <th className="py-2 pr-4">Retries</th>
            <th className="py-2 pr-4">Override</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-zinc-50">
              <td className="py-3 pr-4 font-medium text-zinc-900">${inv.amount.toFixed(2)}</td>
              <td className="py-3 pr-4">
                <Link href={`/admin/clients/${inv.clientId}`} className="text-zinc-800 hover:underline">
                  {inv.client.firstName} {inv.client.lastName}
                </Link>
              </td>
              <td className="py-3 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[inv.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                  {inv.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-zinc-600">
                {inv.chargeDate ? inv.chargeDate.toISOString().slice(0, 10) : "—"}
              </td>
              <td className="py-3 pr-4 text-zinc-600">
                {inv.isRecurring ? `${inv.interval ?? "?"} recurring` : "one-time"}
              </td>
              <td className="py-3 pr-4 text-zinc-600">{inv.retries}</td>
              <td className="py-3 pr-4">
                <form action={invoiceStatusForm} className="flex gap-1">
                  <input type="hidden" name="invoiceId" value={inv.id} />
                  <select name="status" defaultValue={inv.status} className="rounded border border-zinc-300 px-1 py-0.5 text-xs">
                    {Object.keys(statusBadge).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100">
                    Set
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

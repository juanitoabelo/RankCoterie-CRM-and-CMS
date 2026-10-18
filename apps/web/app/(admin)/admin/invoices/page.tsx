import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";
import {
  invoiceStatusForm,
  invoiceRefundForm,
  invoiceVoidForm,
  invoiceChargebackForm,
  invoiceCreateForm,
  invoiceLinkForm,
  invoiceEmailForm,
} from "./actions";

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
  searchParams: Promise<{
    status?: string;
    client?: string;
    from?: string;
    to?: string;
    error?: string;
    ok?: string;
  }>;
}) {
  await requireSection("invoices");
  const { status, client, from, to, error, ok } = await searchParams;
  const statusFilter = Object.keys(statusBadge).includes(status ?? "") ? status : undefined;
  const clientQuery = client?.trim() || undefined;
  const fromFilter = from && !Number.isNaN(new Date(from).getTime()) ? new Date(from) : undefined;
  const toFilter = to && !Number.isNaN(new Date(to).getTime()) ? new Date(to) : undefined;

  const where = {
    client: { tenantId: TENANT_ID },
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(fromFilter || toFilter
      ? {
          createdAt: {
            ...(fromFilter ? { gte: fromFilter } : {}),
            ...(toFilter
              ? { lte: new Date(toFilter.getTime() + 24 * 60 * 60 * 1000 - 1) }
              : {}),
          },
        }
      : {}),
    ...(clientQuery
      ? {
          client: {
            tenantId: TENANT_ID,
            OR: [
              { firstName: { contains: clientQuery, mode: "insensitive" as const } },
              { lastName: { contains: clientQuery, mode: "insensitive" as const } },
              { email: { contains: clientQuery, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [invoices, totals, clientOptions, merchantOptions] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { client: true },
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { client: { tenantId: TENANT_ID } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.client.findMany({
      where: { tenantId: TENANT_ID },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 1000,
    }),
    prisma.merchant.findMany({
      where: { tenantId: TENANT_ID },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const sumByStatus = Object.fromEntries(
    totals.map((t) => [t.status, { sum: t._sum.amount ?? new Prisma.Decimal(0), count: t._count._all }]),
  );

  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  const today = new Date();

  return (
    <div>
      <FlashBanner error={error} ok={ok} />
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
        <form method="get" className="flex flex-wrap items-end gap-2">
          <label className="block text-xs text-zinc-500">
            Status
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="mt-0.5 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">All statuses</option>
              {Object.keys(statusBadge).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Client
            <input
              type="search"
              name="client"
              defaultValue={clientQuery ?? ""}
              placeholder="Name or email…"
              className="mt-0.5 block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            Created from
            <input
              type="date"
              name="from"
              defaultValue={fromFilter ? toISODate(fromFilter) : ""}
              className="mt-0.5 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-500">
            To
            <input
              type="date"
              name="to"
              defaultValue={toFilter ? toISODate(toFilter) : ""}
              className="mt-0.5 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Filter</button>
        </form>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Create invoice</h2>
        <form action={invoiceCreateForm} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <select
            name="clientId"
            required
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm lg:col-span-2"
          >
            <option value="">— select client —</option>
            {clientOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {[c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="amount"
            required
            placeholder="Amount (e.g. 97.00)"
            pattern="\d+(\.\d{1,2})?"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <input
            type="date"
            name="chargeDate"
            defaultValue={toISODate(today)}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            name="chargeNum"
            defaultValue="1"
            min="1"
            title="Charge number (legacy ChargeNum; 1 = first charge)"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <select
            name="merchantId"
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="">— no merchant —</option>
            {merchantOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select
            name="interval"
            defaultValue="MONTHLY"
            title="Bill interval (legacy BillInterval) — used when recurring"
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Bi-weekly</option>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="ANNUAL">Annual</option>
          </select>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm text-zinc-600">
              <input type="checkbox" name="isRecurring" className="rounded border-zinc-300" />
              Recurring
            </label>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Add</button>
          </div>
        </form>
      </section>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2 pr-4">Client</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Charged</th>
            <th className="py-2 pr-4">Recurring</th>
            <th className="py-2 pr-4">Retries</th>
            <th className="py-2 pr-4">Response</th>
            <th className="py-2 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {invoices.map((inv) => {
            const canRefundVoid = inv.status === "APPROVED" || inv.status === "ATTEMPTED" || inv.status === "ERROR";
            const canChargeback = inv.status === "APPROVED" || inv.status === "REFUNDED";
            return (
              <tr key={inv.id} className="hover:bg-zinc-50">
                <td className="py-3 pr-4 font-medium text-zinc-900">${inv.amount.toFixed(2)}</td>
                <td className="py-3 pr-4">
                  <Link href={`/admin/clients/${inv.clientId}/`} className="text-zinc-800 hover:underline">
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
                <td className="py-3 pr-4 text-xs text-zinc-500">{inv.responseMsg ?? "—"}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap items-center gap-1">
                    {inv.payUrl && (
                      <a
                        href={inv.payUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open the client payment link"
                        className="rounded border border-emerald-300 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50"
                      >
                        Pay link ↗
                      </a>
                    )}
                    {!inv.payUrl && canRefundVoid && (
                      <form action={invoiceLinkForm}>
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <button
                          title="Create a hosted payment link (client-billing gateway)"
                          className="rounded border border-emerald-300 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50"
                        >
                          Pay link
                        </button>
                      </form>
                    )}
                    {inv.client.email && inv.status !== "APPROVED" && (
                      <form action={invoiceEmailForm}>
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <button
                          title="Email the invoice + payment link to the client"
                          className="rounded border border-indigo-300 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-50"
                        >
                          Email
                        </button>
                      </form>
                    )}
                    {canRefundVoid && (
                      <>
                        <form action={invoiceRefundForm}>
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <button className="rounded border border-sky-300 px-2 py-0.5 text-xs text-sky-700 hover:bg-sky-50">
                            Refund
                          </button>
                        </form>
                        <form action={invoiceVoidForm}>
                          <input type="hidden" name="invoiceId" value={inv.id} />
                          <button className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100">
                            Void
                          </button>
                        </form>
                      </>
                    )}
                    {canChargeback && (
                      <form action={invoiceChargebackForm}>
                        <input type="hidden" name="invoiceId" value={inv.id} />
                        <button className="rounded border border-purple-300 px-2 py-0.5 text-xs text-purple-700 hover:bg-purple-50">
                          Chargeback
                        </button>
                      </form>
                    )}
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
                  </div>
                </td>
              </tr>
            );
          })}
          {invoices.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-sm text-zinc-400">
                No invoices match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

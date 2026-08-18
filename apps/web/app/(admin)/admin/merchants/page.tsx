import Link from "next/link";
import { prisma } from "@/lib/directory/prismaCatalog";
import { merchantAddForm, merchantToggleForm } from "./actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Merchants | Admin" };

export default async function AdminMerchantsPage() {
  const [merchants, listings] = await Promise.all([
    prisma.merchant.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { listing: { select: { title: true, status: true } } },
    }),
    prisma.listing.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 500,
    }),
  ]);

  const active = merchants.filter((m) => m.status === "ACTIVE").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Merchants</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {merchants.length} total · {active} active (Stripe Connect merchant pool, legacy §4.6)
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Add merchant</h2>
        <form action={merchantAddForm} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            name="name"
            required
            placeholder="Company name"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <input
            type="text"
            name="contactName"
            placeholder="Contact name"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
          />
          <select name="listingId" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">— no linked listing —</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="stripeAccountId"
            placeholder="Stripe acct_… (Connect)"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 font-mono text-sm"
          />
          <select name="status" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="INACTIVE">INACTIVE</option>
            <option value="ACTIVE">ACTIVE</option>
          </select>
          <select name="payoutMethod" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">— payout method —</option>
            <option value="STRIPE_CONNECT">STRIPE_CONNECT</option>
            <option value="ACH">ACH</option>
            <option value="CHECK">CHECK</option>
            <option value="CARD">CARD</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              name="feePercent"
              defaultValue="0"
              min="0"
              max="100"
              step="0.01"
              placeholder="Fee %"
              className="w-24 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Add</button>
          </div>
        </form>
      </section>

      <table className="mt-6 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Merchant</th>
            <th className="py-2 pr-4">Linked listing</th>
            <th className="py-2 pr-4">Stripe Connect</th>
            <th className="py-2 pr-4">Payout</th>
            <th className="py-2 pr-4">Fee</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2 pr-4">Toggle</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {merchants.map((m) => (
            <tr key={m.id} className="hover:bg-zinc-50">
              <td className="py-3 pr-4">
                <p className="font-medium text-zinc-900">{m.name}</p>
                {m.contactName && <p className="text-xs text-zinc-400">{m.contactName}</p>}
                {m.email && <p className="text-xs text-zinc-400">{m.email}</p>}
              </td>
              <td className="py-3 pr-4 text-zinc-600">
                {m.listing ? (
                  <Link href={`/admin/listings/${m.listingId}/edit/`} className="text-zinc-700 hover:underline">
                    {m.listing.title}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-3 pr-4 font-mono text-xs text-zinc-500">
                {m.stripeAccountId ?? "not connected"}
              </td>
              <td className="py-3 pr-4 text-zinc-600">{m.payoutMethod ?? "—"}</td>
              <td className="py-3 pr-4 text-zinc-600">{m.feePercent.toFixed(2)}%</td>
              <td className="py-3 pr-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    m.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {m.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-zinc-500">{m.createdAt.toISOString().slice(0, 10)}</td>
              <td className="py-3 pr-4">
                <form action={merchantToggleForm}>
                  <input type="hidden" name="merchantId" value={m.id} />
                  <button className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100">
                    {m.status === "ACTIVE" ? "Deactivate" : "Activate"}
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
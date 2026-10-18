import Link from "next/link";
import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { merchantEditForm, merchantToggleForm } from "../actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Merchant | Admin" };

const PAYOUT_AGE_DAYS = 45;

export default async function AdminMerchantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("merchants");
  const { id } = await params;
  const { error, ok } = await searchParams;
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: {
      listing: { select: { title: true, status: true } },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { client: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  if (!merchant) notFound();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PAYOUT_AGE_DAYS);

  // Legacy §4.6 merchant pay queue: approved invoices older than 45 days
  // are payable to the merchant minus their fee cut.
  const agedApproved = merchant.invoices.filter(
    (i) => i.status === "APPROVED" && i.createdAt < cutoff,
  );
  const fee = Number(merchant.feePercent) / 100;
  const queueGross = agedApproved.reduce((s, i) => s.add(i.amount), new Prisma.Decimal(0));
  const queueNet = queueGross.mul(1 - fee);

  const allApproved = merchant.invoices.filter((i) => i.status === "APPROVED");
  const lifetimeGross = allApproved.reduce((s, i) => s.add(i.amount), new Prisma.Decimal(0));
  const lifetimeNet = lifetimeGross.mul(1 - fee);

  const listings = await prisma.listing.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
    take: 500,
  });

  return (
    <div>
      <Link href="/admin/merchants" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to merchants
      </Link>
      <FlashBanner error={error} ok={ok} />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{merchant.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {merchant.contactName ?? "no contact"} · {merchant.email ?? "no email"} · created{" "}
            {merchant.createdAt.toISOString().slice(0, 10)} ·{" "}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                merchant.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              {merchant.status}
            </span>
          </p>
        </div>
        <form action={merchantToggleForm}>
          <input type="hidden" name="merchantId" value={merchant.id} />
          <button className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
            {merchant.status === "ACTIVE" ? "Deactivate" : "Activate"}
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Edit merchant</h2>
          <form action={merchantEditForm} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="merchantId" value={merchant.id} />
            <label className="block text-sm">
              <span className="text-zinc-600">Name</span>
              <input
                type="text"
                name="name"
                defaultValue={merchant.name}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Contact name</span>
              <input
                type="text"
                name="contactName"
                defaultValue={merchant.contactName ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Email</span>
              <input
                type="email"
                name="email"
                defaultValue={merchant.email ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Linked listing</span>
              <select
                name="listingId"
                defaultValue={merchant.listingId ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">— no linked listing —</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Stripe Connect account</span>
              <input
                type="text"
                name="stripeAccountId"
                defaultValue={merchant.stripeAccountId ?? ""}
                placeholder="acct_…"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 font-mono text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Payout method</span>
              <select
                name="payoutMethod"
                defaultValue={merchant.payoutMethod ?? ""}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">— payout method —</option>
                <option value="STRIPE_CONNECT">STRIPE_CONNECT</option>
                <option value="ACH">ACH</option>
                <option value="CHECK">CHECK</option>
                <option value="CARD">CARD</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Fee % (merchant cut)</span>
              <input
                type="number"
                name="feePercent"
                defaultValue={merchant.feePercent.toString()}
                min="0"
                max="100"
                step="0.01"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
                Save changes
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Payout report (legacy §4.6)
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Merchant fee</dt>
              <dd className="text-zinc-900">{merchant.feePercent.toFixed(2)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">
                Payable queue (APPROVED, aged {PAYOUT_AGE_DAYS}+ days)
              </dt>
              <dd className="text-zinc-900">
                {agedApproved.length} invoices · ${queueGross.toFixed(2)} gross
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Estimated net payout</dt>
              <dd className="font-medium text-emerald-700">${queueNet.toFixed(2)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-100 pt-2">
              <dt className="text-zinc-500">Lifetime (loaded, APPROVED)</dt>
              <dd className="text-zinc-900">
                ${lifetimeGross.toFixed(2)} gross → ${lifetimeNet.toFixed(2)} net
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Stripe Connect</dt>
              <dd className="font-mono text-xs text-zinc-700">
                {merchant.stripeAccountId ?? "not connected"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Linked listing</dt>
              <dd className="text-zinc-900">
                {merchant.listing ? (
                  <Link href={`/admin/listings/${merchant.listingId}/edit/`} className="underline hover:text-zinc-700">
                    {merchant.listing.title}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-zinc-400">
            Payout amounts are estimates from loaded invoices; actual settlement happens via the
            configured payout method.
          </p>
        </section>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Invoices ({merchant.invoices.length} recent)
      </h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Client</th>
            <th className="py-2 pr-4">Created</th>
            <th className="py-2 pr-4">In payout queue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {merchant.invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-zinc-50">
              <td className="py-3 pr-4 font-medium text-zinc-900">${inv.amount.toFixed(2)}</td>
              <td className="py-3 pr-4 text-zinc-600">{inv.status}</td>
              <td className="py-3 pr-4 text-zinc-600">
                <Link href={`/admin/clients/${inv.clientId}/`} className="hover:underline">
                  {[inv.client.firstName, inv.client.lastName].filter(Boolean).join(" ") || inv.clientId}
                </Link>
              </td>
              <td className="py-3 pr-4 text-zinc-500">{inv.createdAt.toISOString().slice(0, 10)}</td>
              <td className="py-3 pr-4">
                {inv.status === "APPROVED" && inv.createdAt < cutoff ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    ready
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </td>
            </tr>
          ))}
          {merchant.invoices.length === 0 && (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-zinc-400">
                No invoices linked to this merchant yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

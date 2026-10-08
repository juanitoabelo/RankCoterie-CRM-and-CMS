import { prisma } from "@/lib/directory/prismaCatalog";
import { getFeaturedPlacement } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export const revalidate = 0;

export default async function FeaturedPlacementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const placement = await getFeaturedPlacement(id);

  if (!placement) notFound();

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-700",
    RESERVED: "bg-amber-100 text-amber-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    EXPIRED: "bg-zinc-100 text-zinc-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/featured-placements" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Placements
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 flex items-center gap-3">
            {placement.label}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[placement.status] ?? "bg-zinc-100 text-zinc-700"}`}>
              {placement.status}
            </span>
          </h1>
          <p className="text-zinc-500 mt-1">{placement.slug}</p>
        </div>
        <Link
          href={`/admin/featured-placements/${placement.id}/edit`}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Edit Placement
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Placement Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-zinc-500">Type</dt>
                <dd className="mt-1 font-medium text-zinc-900">{placement.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Slug</dt>
                <dd className="mt-1 font-mono text-sm text-zinc-900">{placement.slug}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Label</dt>
                <dd className="mt-1 font-medium text-zinc-900">{placement.label}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[placement.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                    {placement.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Category</dt>
                <dd className="mt-1 text-zinc-600">{placement.category?.title ?? "Global"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Region</dt>
                <dd className="mt-1 text-zinc-600">{placement.region?.stateFull ?? "Global"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Max Slots</dt>
                <dd className="mt-1 font-medium text-zinc-900">{placement.maxSlots}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Current Slots</dt>
                <dd className="mt-1 font-medium text-zinc-900">{placement.currentSlots} / {placement.maxSlots}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Created</dt>
                <dd className="mt-1 text-zinc-600">{format(new Date(placement.createdAt), "PPP")}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Updated</dt>
                <dd className="mt-1 text-zinc-600">{format(new Date(placement.updatedAt), "PPP")}</dd>
              </div>
            </dl>
          </section>

          {/* Pricing */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Pricing</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-zinc-500">Monthly</dt>
                <dd className="mt-1 text-2xl font-semibold text-zinc-900">${placement.priceMonthly.toFixed(2)} /mo</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Quarterly</dt>
                <dd className="mt-1 text-2xl font-semibold text-zinc-900">${placement.priceQuarterly ? `$${placement.priceQuarterly.toFixed(2)} /qtr` : "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Annually</dt>
                <dd className="mt-1 text-2xl font-semibold text-zinc-900">${placement.priceAnnually ? `$${placement.priceAnnually.toFixed(2)} /yr` : "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Currency</dt>
                <dd className="mt-1 text-zinc-900">{placement.currency}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Max Slots</dt>
                <dd className="mt-1 text-zinc-900">{placement.maxSlots}</dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-sm text-zinc-500">Description</dt>
                <dd className="mt-1 text-zinc-600 whitespace-pre-wrap">{placement.description || "—"}</dd>
              </div>
            </dl>
          </section>

          {/* Scheduling */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Scheduling</h2>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm text-zinc-500">Starts At</dt>
                <dd className="mt-1 text-zinc-600">{placement.startsAt ? format(new Date(placement.startsAt), "PPP") : "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Ends At</dt>
                <dd className="mt-1 text-zinc-600">{placement.endsAt ? format(new Date(placement.endsAt), "PPP") : "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Category</dt>
                <dd className="mt-1 text-zinc-600">{placement.category?.title ?? "Global"}</dd>
              </div>
              <div>
                <dt className="text-sm text-zinc-500">Region</dt>
                <dd className="mt-1 text-zinc-600">{placement.region?.stateFull ?? "Global"}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Sidebar - Purchases */}
        <aside className="space-y-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900">Purchases ({placement.purchases.length})</h3>
              <Link href={`/admin/featured-placements/${placement.id}/purchases/new`} className="text-sm text-blue-600 hover:underline">
                Add Purchase
              </Link>
            </div>
            {placement.purchases.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No purchases yet</p>
            ) : (
              <div className="space-y-3">
                {placement.purchases.map((p) => (
                  <div key={p.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-900">{p.listing.title}</p>
                        <p className="text-sm text-zinc-500">${p.pricePaid.toFixed(2)} / {p.billingInterval}</p>
                      </div>
                      <span className="text-sm text-zinc-500">{format(new Date(p.currentPeriodEnd), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link href={`/admin/featured-placements/${placement.id}/edit`} className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Edit Placement
              </Link>
              <Link href={`/admin/featured-placements/${placement.id}/purchases/new`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Add Purchase
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
import { prisma } from "@/lib/directory/prismaCatalog";
import { getFeaturedPlacements, getFeaturedPlacementTypes, getFeaturedPlacementStatuses } from "./actions";
import Link from "next/link";

export const revalidate = 0;

export const metadata = { title: "Featured Placements | Admin" };

export default async function FeaturedPlacementsPage() {
  const [placements, types, statuses] = await Promise.all([
    getFeaturedPlacements(),
    getFeaturedPlacementTypes(),
    getFeaturedPlacementStatuses(),
  ]);

  const typeLabels = Object.fromEntries(
    [
      { value: "HOME_HERO", label: "Homepage Hero (1 slot)" },
      { value: "HOME_FEATURED", label: "Homepage Featured Grid (3 slots)" },
      { value: "CATEGORY_TOP", label: "Category Top Banner (1 per category)" },
      { value: "CATEGORY_FEATURED", label: "Category Featured Grid (3 per category)" },
      { value: "REGION_SPOTLIGHT", label: "Region Spotlight (1 per region)" },
      { value: "SEARCH_TOP", label: "Search Results Top (2 slots)" },
    ].map((t) => [t.value, t.label])
  );

  const statusLabels = Object.fromEntries(
    [
      { value: "AVAILABLE", label: "Available" },
      { value: "RESERVED", label: "Reserved" },
      { value: "ACTIVE", label: "Active" },
      { value: "EXPIRED", label: "Expired" },
      { value: "CANCELLED", label: "Cancelled" },
    ].map((s) => [s.value, s.label])
  );

  const statusColors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-700",
    RESERVED: "bg-amber-100 text-amber-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    EXPIRED: "bg-zinc-100 text-zinc-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Featured Placements</h1>
          <p className="text-zinc-500 mt-1">Manage featured placement slots and pricing</p>
        </div>
        <Link
          href="/admin/featured-placements/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Create Placement
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 font-medium text-zinc-500">Placement</th>
              <th className="p-3 font-medium text-zinc-500">Type</th>
              <th className="p-3 font-medium text-zinc-500">Target</th>
              <th className="p-3 font-medium text-zinc-500">Pricing</th>
              <th className="p-3 font-medium text-zinc-500">Slots</th>
              <th className="p-3 font-medium text-zinc-500">Status</th>
              <th className="p-3 font-medium text-zinc-500">Purchases</th>
              <th className="p-3 font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {renderRows()}
          </tbody>
        </table>
      </div>
    </div>
  );

  function renderRows() {
    if (placements.length === 0) {
      return (
        <tr>
          <td colSpan={8} className="p-8 text-center text-zinc-500">
            No featured placements configured yet.
            <Link href="/admin/featured-placements/new" className="ml-2 text-blue-600 hover:underline">
              Create your first placement
            </Link>
          </td>
        </tr>
      );
    }

    return (
      <>
        {placements.map((p) => (
          <tr key={p.id} className="hover:bg-zinc-50">
            <td className="p-3">
              <p className="font-medium text-zinc-900">{p.label}</p>
              <p className="text-xs text-zinc-500">{p.slug}</p>
            </td>
            <td className="p-3">
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {typeLabels[p.type] ?? p.type}
              </span>
            </td>
            <td className="p-3 text-zinc-600">
              {p.category && (
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4h6a4 4 0 014 4v5" /></svg>
                  {p.category.title}
                </span>
              )}
              {p.region && (
                <span className="inline-flex items-center gap-1 ml-2">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {p.region.stateFull}
                </span>
              )}
              {!p.category && !p.region && <span className="text-zinc-400">Global</span>}
            </td>
            <td className="p-3 text-zinc-600">
              <div className="text-sm font-medium">${p.priceMonthly.toFixed(2)}/mo</div>
              {p.priceQuarterly && <p className="text-xs text-zinc-400">${p.priceQuarterly.toFixed(2)}/qtr</p>}
              {p.priceAnnually && <p className="text-xs text-zinc-400">${p.priceAnnually.toFixed(2)}/yr</p>}
            </td>
            <td className="p-3">
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                {p.currentSlots} / {p.maxSlots}
              </span>
            </td>
            <td className="p-3">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status] ?? "bg-zinc-100 text-zinc-700"}`}>
                {statusLabels[p.status] ?? p.status}
              </span>
            </td>
            <td className="p-3 text-zinc-600">{p._count.purchases}</td>
            <td className="p-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/featured-placements/${p.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </Link>
                <Link
                  href={`/admin/featured-placements/${p.id}/edit`}
                  className="text-sm text-zinc-600 hover:underline"
                >
                  Edit
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </>
    );
  }
}

const typeLabels = Object.fromEntries(
  [
    { value: "HOME_HERO", label: "Homepage Hero (1 slot)" },
    { value: "HOME_FEATURED", label: "Homepage Featured Grid (3 slots)" },
    { value: "CATEGORY_TOP", label: "Category Top Banner (1 per category)" },
    { value: "CATEGORY_FEATURED", label: "Category Featured Grid (3 per category)" },
    { value: "REGION_SPOTLIGHT", label: "Region Spotlight (1 per region)" },
    { value: "SEARCH_TOP", label: "Search Results Top (2 slots)" },
  ].map((t) => [t.value, t.label])
);

const statusLabels: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  RESERVED: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-zinc-100 text-zinc-700",
  CANCELLED: "bg-red-100 text-red-700",
};
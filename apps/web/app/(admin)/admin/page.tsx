/**
 * Admin Dashboard Page
 * 
 * Uses the Dashboard module for stats.
 */
import Link from "next/link";
import { getDashboardStats } from "@/modules/dashboard";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const cards = [
    { label: "Listings pending review", value: stats.pendingListings, href: "/admin/listings?status=PENDING_REVIEW" },
    { label: "Live listings", value: stats.liveListings, href: "/admin/listings?status=LIVE" },
    { label: "Active exclusions", value: stats.activeExclusions, href: "/admin/exclusions" },
    { label: "Content templates", value: stats.contentTemplates, href: "/admin/content" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300"
          >
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

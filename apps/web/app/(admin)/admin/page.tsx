import Link from "next/link";
import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const [pending, live, excluded, templates] = await Promise.all([
    prisma.listing.count({ where: { tenantId: TENANT_ID, status: "PENDING_REVIEW" } }),
    prisma.listing.count({ where: { tenantId: TENANT_ID, status: "LIVE" } }),
    prisma.excludedCompany.count({ where: { tenantId: TENANT_ID, isActive: true } }),
    prisma.contentTemplate.count({ where: { tenantId: TENANT_ID } }),
  ]);

  const cards = [
    { label: "Listings pending review", value: pending, href: "/admin/listings?status=PENDING_REVIEW" },
    { label: "Live listings", value: live, href: "/admin/listings?status=LIVE" },
    { label: "Active exclusions", value: excluded, href: "/admin/exclusions" },
    { label: "Content templates", value: templates, href: "/admin/content" },
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
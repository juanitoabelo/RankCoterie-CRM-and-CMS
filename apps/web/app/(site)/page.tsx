import Link from "next/link";
import { getCatalogRepo } from "@/lib/directory/catalog";
import { prisma } from "@/lib/directory/prismaCatalog";
import { sanitizeHtml } from "@/lib/style-guide";
import { TENANT_ID } from "@/lib/tenant";

export const revalidate = 3600;

export default async function HomePage() {
  const repo = await getCatalogRepo();
  const [categories, sections, widgets] = await Promise.all([
    repo.getCategories(),
    prisma.section.findMany({ where: { tenantId: TENANT_ID, status: "LIVE" }, orderBy: { order: "asc" } }),
    prisma.widget.findMany({ where: { tenantId: TENANT_ID, active: true, placements: { some: { slot: "HOME", active: true } } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-zinc-900">Christian Programs Directory</h1>
      <p className="mt-2 max-w-2xl text-zinc-600">
        Trusted, faith-based programs and services — searchable by category and state.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/g/${c.slug}/`}
            className="rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:shadow-sm"
          >
            <h2 className="font-medium text-zinc-900">{c.title}</h2>
            <p className="mt-2 text-sm text-zinc-600">Browse states &gt;</p>
          </Link>
        ))}
      </div>
      {sections.map((section) => (
        <section key={section.id} className="mt-12 border-t border-zinc-200 pt-8">
          <h2 className="text-2xl font-semibold text-zinc-900">{section.heading ?? section.title}</h2>
          {section.body && <div className="prose mt-3 max-w-3xl text-zinc-600" dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.body) }} />}
        </section>
      ))}
      {widgets.length > 0 && <aside className="mt-12 grid gap-4 sm:grid-cols-2">{widgets.map((widget) => (
        <article key={widget.id} className="rounded-xl border border-zinc-200 bg-white p-5">
          {widget.imageAssetId && <img src={`/api/assets/${widget.imageAssetId}`} alt="" className="mb-4 max-h-48 w-full object-cover" />}
          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(widget.html) }} />
          {widget.redirectUrl && <Link href={widget.redirectUrl} className="mt-4 inline-block text-sm font-medium text-blue-600">Learn more</Link>}
        </article>
      ))}</aside>}
    </div>
  );
}
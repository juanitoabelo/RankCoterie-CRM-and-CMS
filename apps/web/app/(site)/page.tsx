import Link from "next/link";
import { getCatalogRepo } from "@/lib/directory/catalog";

export const revalidate = 3600;

export default async function HomePage() {
  const repo = await getCatalogRepo();
  const categories = await repo.getCategories();

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
    </div>
  );
}
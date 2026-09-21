import Link from "next/link";
import { listBlogTemplates } from "./actions";
import CreateBlogTemplateButton from "./components/CreateBlogTemplateButton";
import { SetDefaultForm, DeleteForm } from "./components/TemplateActions";

export const revalidate = 0;

export default async function BlogTemplateListPage() {
  const templates = await listBlogTemplates();
  const listingTemplates = templates.filter((t) => t.type === "listing");
  const singleTemplates = templates.filter((t) => t.type === "single");

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Content</span> /{" "}
        <span className="text-zinc-700">Blog Templates</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Blog Templates
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Design custom blog layouts for listing pages and single articles.
        Assign templates globally, per page type, or to individual pages.
      </p>

      {/* ── LISTING TEMPLATES ──────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-800">Listing Templates</h2>
          <CreateBlogTemplateButton type="listing" label="+ New Listing" />
        </div>
        {listingTemplates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No listing templates yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listingTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/blog-template/${t.id}/edit`}
                      className="text-sm font-medium text-zinc-900 hover:text-amber-600"
                    >
                      {t.name}
                    </Link>
                    {t.isDefault && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Updated {new Date(t.updatedAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/blog-template/${t.id}/edit`}
                    className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  >
                    Edit
                  </Link>
                  <SetDefaultForm id={t.id} isDefault={t.isDefault} />
                  <DeleteForm id={t.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SINGLE TEMPLATES ───────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-800">Single Article Templates</h2>
          <CreateBlogTemplateButton type="single" label="+ New Single" />
        </div>
        {singleTemplates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No single article templates yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {singleTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/blog-template/${t.id}/edit`}
                      className="text-sm font-medium text-zinc-900 hover:text-amber-600"
                    >
                      {t.name}
                    </Link>
                    {t.isDefault && (
                      <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-700">
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Updated {new Date(t.updatedAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/admin/blog-template/${t.id}/edit`}
                    className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                  >
                    Edit
                  </Link>
                  <SetDefaultForm id={t.id} isDefault={t.isDefault} />
                  <DeleteForm id={t.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

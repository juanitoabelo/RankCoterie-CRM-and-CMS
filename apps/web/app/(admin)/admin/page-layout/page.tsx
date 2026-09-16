import Link from "next/link";
import { listPageLayouts } from "./actions";
import CreatePageLayoutButton from "./components/CreatePageLayoutButton";
import { SetDefaultForm, DeleteForm } from "./components/TemplateActions";

export const revalidate = 0;

export default async function PageLayoutListPage() {
  const templates = await listPageLayouts();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Page Layout Builder</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Page Layout Templates
        </h1>
        <CreatePageLayoutButton />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Design custom page layouts using the drag-and-drop builder.
        Assign templates globally, per page type, or to individual pages.
      </p>

      {/* ── TEMPLATES ──────────────────────────────────────────────── */}
      <section className="mt-8">
        {templates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No page layout templates yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/page-layout/${t.id}/edit`}
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
                    href={`/admin/page-layout/${t.id}/edit`}
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

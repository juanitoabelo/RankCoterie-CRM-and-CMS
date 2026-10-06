import Link from "next/link";
import { listGeoCategoryTemplates } from "./actions";
import CreateGeoCategoryTemplateButton from "./components/CreateGeoCategoryTemplateButton";
import { SetDefaultForm, DeleteForm } from "./components/TemplateActions";

export const revalidate = 0;

export default async function GeoCategoryTemplateListPage() {
  const templates = await listGeoCategoryTemplates();
  const fullwidthTemplates = templates.filter((t) => t.layout !== "SIDEBAR");
  const sidebarTemplates = templates.filter((t) => t.layout === "SIDEBAR");

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Geo-Targeting</span> /{" "}
        <span className="text-zinc-700">Geo Category Custom Single Page</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Geo Category Custom Single Page
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Design custom single-page templates for GeoCategory pages using the page
        builder with dynamic bindings to category content, region links, images,
        FAQ, and listings. Assign a template from the GeoCategory edit screen —
        unassigned categories use the default variation.
      </p>

      {/* ── FULLWIDTH VARIATIONS ───────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-800">Fullwidth Variations</h2>
          <CreateGeoCategoryTemplateButton layout="FULLWIDTH" label="+ New Fullwidth" />
        </div>
        {fullwidthTemplates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No fullwidth templates yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fullwidthTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/geo-category-template/${t.id}/edit`}
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
                    href={`/admin/geo-category-template/${t.id}/edit`}
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

      {/* ── RIGHT SIDEBAR VARIATIONS ───────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-zinc-800">Right Sidebar Variations</h2>
          <CreateGeoCategoryTemplateButton layout="SIDEBAR" label="+ New Sidebar" />
        </div>
        {sidebarTemplates.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No sidebar templates yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sidebarTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/geo-category-template/${t.id}/edit`}
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
                    href={`/admin/geo-category-template/${t.id}/edit`}
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

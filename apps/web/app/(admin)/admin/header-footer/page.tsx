import Link from "next/link";
import { listHeaderFooters } from "./actions";
import CreateHeaderFooterButton from "./components/CreateHeaderFooterButton";
import { SetDefaultForm, DeleteForm } from "./components/TemplateActions";

export const revalidate = 0;

export default async function HeaderFooterListPage() {
  const templates = await listHeaderFooters();

  const headers = templates.filter((t) => t.type === "HEADER");
  const footers = templates.filter((t) => t.type === "FOOTER");

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Header & Footer Builder</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Header & Footer Templates
        </h1>
        <CreateHeaderFooterButton />
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Design custom headers and footers using the drag-and-drop builder.
        Assign templates globally, per page type, or to individual pages.
      </p>

      {/* ── HEADERS ──────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          Header Templates
        </h2>
        {headers.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No header templates yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {headers.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/header-footer/${t.id}/edit`}
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
                    href={`/admin/header-footer/${t.id}/edit`}
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

      {/* ── FOOTERS ──────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          Footer Templates
        </h2>
        {footers.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-400">
            No footer templates yet. Create one to get started.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {footers.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/header-footer/${t.id}/edit`}
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
                    href={`/admin/header-footer/${t.id}/edit`}
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

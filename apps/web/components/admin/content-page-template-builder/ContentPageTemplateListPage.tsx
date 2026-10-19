import Link from "next/link";
import type { ContentPageKind } from "@/lib/content-page-template/types";
import { listContentPageTemplatesAction } from "@/modules/content-page-template/actions";
import CreateContentPageTemplateButton from "./CreateContentPageTemplateButton";
import { SetDefaultForm, DeleteForm } from "./ContentPageTemplateActions";

const LIST_PATH: Record<ContentPageKind, string> = {
  topic: "/admin/topic-template",
  subtopic: "/admin/subtopic-template",
};

export default async function ContentPageTemplateListPage({ kind }: { kind: ContentPageKind }) {
  const templates = await listContentPageTemplatesAction(kind);
  const fullwidthTemplates = templates.filter((t) => t.layout !== "SIDEBAR");
  const sidebarTemplates = templates.filter((t) => t.layout === "SIDEBAR");

  const noun = kind === "topic" ? "Topic" : "SubTopic";
  const parentLabel = kind === "topic" ? "Topics" : "SubTopics";
  const listPath = LIST_PATH[kind];

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">{parentLabel}</span> /{" "}
        <span className="text-zinc-700">{noun} Custom Single Page</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {noun} Custom Single Page
        </h1>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Design custom single-page templates for {noun} pages using the page builder
        with dynamic bindings to {noun} content, images, sections, and related
        content. Assign a template from the {noun} edit screen — unassigned pages
        use the default variation.
      </p>

      {[
        { title: "Fullwidth Variations", layout: "FULLWIDTH" as const, rows: fullwidthTemplates, newLabel: "+ New Fullwidth" },
        { title: "Right Sidebar Variations", layout: "SIDEBAR" as const, rows: sidebarTemplates, newLabel: "+ New Sidebar" },
      ].map((group) => (
        <section key={group.layout} className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-800">{group.title}</h2>
            <CreateContentPageTemplateButton kind={kind} layout={group.layout} label={group.newLabel} />
          </div>
          {group.rows.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">
              No {group.layout === "SIDEBAR" ? "sidebar" : "fullwidth"} templates yet. Create one to get started.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.rows.map((t) => (
                <div key={t.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`${listPath}/${t.id}/edit`}
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
                      href={`${listPath}/${t.id}/edit`}
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
      ))}
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/modules/shared";
import { ensureCompanyListingTemplatePresets, listCompanyListingTemplates } from "./actions";
import DeleteTemplateButton from "./components/DeleteTemplateButton";
import SetDefaultButton from "./components/SetDefaultButton";
import UseSystemDefaultButton from "./components/UseSystemDefaultButton";

export const revalidate = 0;

export default async function CompanyListingLayoutsPage() {
  await ensureCompanyListingTemplatePresets();
  const templates = await listCompanyListingTemplates();
  const assigned = await prisma.listing.groupBy({
    by: ["companyListingTemplateId"],
    where: { companyListingTemplateId: { not: null } },
    _count: { _all: true },
  });
  const assignedByTemplate = new Map(
    assigned.map((a) => [a.companyListingTemplateId, a._count._all]),
  );
  const unassignedCount = await prisma.listing.count({ where: { companyListingTemplateId: null, isLandingPage: true } });
  const defaultTemplate = templates.find((t) => t.isDefault);

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Directory</span> /{" "}
        <span className="text-zinc-700">Company Listing Custom Landing Page Layout</span>
      </p>
      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Company Listing Custom Landing Page Layout</h1>
        <Link
          href="/admin/company-listing-layouts/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add New Custom Landing Page
        </Link>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Custom single-company-landing-page templates built from blocks with data-bound tokens.
        Assign a template per company page from the company page editor, or set one as the
        site-wide default below. Company pages without an explicit template use the
        default template if one is set; otherwise the built-in system layout.
      </p>

      {/* System default card */}
      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-900">System Default</h2>
              <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-semibold uppercase text-zinc-600">Built-in</span>
              {defaultTemplate && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase text-amber-700">
                  Overridden by &ldquo;{defaultTemplate.name}&rdquo;
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-sm text-zinc-600">
              Built-in layout: hero with avatar and cover, gallery, video, map,
              reviews, and a rich sidebar (contact, quick facts, hours, areas,
              categories, claim, social).
              {defaultTemplate
                ? " Currently overridden &mdash; company pages without an explicit template use the default template below."
                : " Used for any company page that has no template assigned and no site-wide default is set."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {defaultTemplate && <UseSystemDefaultButton />}
            <span className="text-sm text-zinc-500">
              {unassignedCount} company page{unassignedCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Template grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((t) => {
          const blockCount = Array.isArray(t.blocks) ? t.blocks.length : 0;
          const widgetCount = Array.isArray(t.sidebar) ? t.sidebar.length : 0;
          const usage = assignedByTemplate.get(t.id) ?? 0;
          const isDefault = t.isDefault;
          return (
            <div
              key={t.id}
              className={`flex flex-col rounded-xl border bg-white p-5 ${
                isDefault ? "border-amber-300 ring-2 ring-amber-200" : "border-zinc-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900">{t.name}</h3>
                    {isDefault && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Default</span>
                    )}
                    {t.isPreset && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-700">Preset</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">/{t.slug}</p>
                </div>
              </div>
              {t.description && <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{t.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                <span className="rounded bg-zinc-100 px-2 py-0.5 capitalize">{t.layout}</span>
                <span className="rounded bg-zinc-100 px-2 py-0.5 capitalize">hero: {t.heroVariant}</span>
                <span className="rounded bg-zinc-100 px-2 py-0.5">{blockCount} blocks</span>
                {widgetCount > 0 && <span className="rounded bg-zinc-100 px-2 py-0.5">{widgetCount} widgets</span>}
              </div>
              <div className="mt-4 flex flex-1 flex-col gap-3">
                <span className="text-sm text-zinc-500">
                  {usage === 0 ? "Unused" : `Assigned to ${usage} company page${usage === 1 ? "" : "s"}`}
                  {isDefault && unassignedCount > 0 ? ` &middot; default for ${unassignedCount} more` : ""}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <SetDefaultButton id={t.id} name={t.name} isDefault={isDefault} />
                  <Link
                    href={`/admin/company-listing-layouts/${t.id}/edit`}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Edit
                  </Link>
                  <DeleteTemplateButton id={t.id} name={t.name} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
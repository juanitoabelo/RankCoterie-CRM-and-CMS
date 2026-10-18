import { requireSection } from "@/modules/auth";
import { buildSitemapReport } from "@/lib/seo/sitemap";
import SitemapManager from "./components/SitemapManager";

export const revalidate = 0;

const SAMPLE_LIMIT = 20;

export default async function SitemapPage() {
  await requireSection("sitemap");
  const report = await buildSitemapReport();

  const groups = report.groups.map((g) => ({
    key: g.key,
    label: g.label,
    count: g.urls.length,
    sample: g.urls.slice(0, SAMPLE_LIMIT),
  }));

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Sitemap</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Sitemap</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        The public XML sitemap search engines crawl at{" "}
        <span className="font-medium text-zinc-800">{report.siteUrl}/sitemap.xml</span>.
        It is built from live, index-eligible content only, refreshed hourly, and
        can be rebuilt on demand.
      </p>

      <div className="mt-8">
        <SitemapManager siteUrl={report.siteUrl} total={report.total} groups={groups} />
      </div>
    </div>
  );
}

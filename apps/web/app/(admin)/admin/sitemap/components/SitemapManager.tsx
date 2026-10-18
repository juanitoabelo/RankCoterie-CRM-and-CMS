"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateSitemap } from "../actions";

export type SitemapGroupView = {
  key: string;
  label: string;
  count: number;
  sample: string[];
};

export default function SitemapManager({
  siteUrl,
  total,
  groups,
}: {
  siteUrl: string;
  total: number;
  groups: SitemapGroupView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  const robotsUrl = `${siteUrl}/robots.txt`;

  function handleRegenerate() {
    setMessage(null);
    startTransition(async () => {
      const result = await regenerateSitemap();
      if (result.ok) {
        setMessage({ type: "ok", text: "Sitemap regenerated from the latest content." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500">Total URLs in sitemap</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">{total.toLocaleString()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={sitemapUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Open sitemap.xml ↗
            </a>
            <a
              href={robotsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Open robots.txt ↗
            </a>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Regenerating…" : "Regenerate now"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          The sitemap regenerates automatically every hour and on deploy. Use
          &ldquo;Regenerate now&rdquo; to rebuild it immediately after publishing
          content.
        </p>
        {message && (
          <p
            className={`mt-3 text-xs ${
              message.type === "ok" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2">Section</th>
              <th className="px-4 py-2 text-right">URLs</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key} className="border-b border-zinc-100 last:border-0 align-top">
                <td className="px-4 py-3">
                  <details>
                    <summary className="cursor-pointer text-zinc-700">
                      {g.label}
                      {g.count > 0 && (
                        <span className="ml-2 text-xs text-zinc-400">
                          (click to preview{g.count > g.sample.length ? ` first ${g.sample.length}` : ""})
                        </span>
                      )}
                    </summary>
                    {g.sample.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {g.sample.map((url) => (
                          <li key={url}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-xs text-blue-600 hover:underline"
                            >
                              {url}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-400">No URLs in this section.</p>
                    )}
                  </details>
                </td>
                <td className="px-4 py-3 text-right font-medium text-zinc-900">
                  {g.count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

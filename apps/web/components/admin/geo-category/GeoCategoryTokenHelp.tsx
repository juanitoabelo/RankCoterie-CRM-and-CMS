"use client";

import { GEO_CATEGORY_TOKENS } from "@/lib/listing-templates/tokens-help";

export default function GeoCategoryTokenHelp({
  summary = "Available content tokens",
}: {
  summary?: string;
}) {
  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
      <summary className="cursor-pointer text-xs font-medium text-zinc-700">
        {summary} ({GEO_CATEGORY_TOKENS.length}) — click to view
      </summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {GEO_CATEGORY_TOKENS.map((item) => (
          <div key={item.token} className="text-xs text-zinc-600">
            <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-zinc-800 ring-1 ring-zinc-200">
              {item.token}
            </code>
            <span className="ml-2">→ {item.example}</span>
            {item.note && <span className="block text-zinc-400">{item.note}</span>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Tokens are case-insensitive. Parent /g/ pages strip them; state and city pages render them with the selected region.
      </p>
    </details>
  );
}

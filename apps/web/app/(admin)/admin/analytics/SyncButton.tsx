"use client";

import { useState, useTransition } from "react";
import type { SyncResult } from "@/modules/analytics/types";
import { runCompetitorSyncAction, runGscSyncAction } from "./actions";

export default function SyncButton({
  kind,
  label,
}: {
  kind: "gsc" | "competitors";
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  const run = () => {
    startTransition(async () => {
      const next = kind === "gsc" ? await runGscSyncAction() : await runCompetitorSyncAction();
      setResult(next);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
      >
        {pending ? "Syncing…" : label}
      </button>
      {result && (
        <span className={result.ok ? "text-sm text-green-700" : "text-sm text-amber-700"}>
          {result.message}
        </span>
      )}
    </div>
  );
}

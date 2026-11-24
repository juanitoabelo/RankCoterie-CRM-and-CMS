"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearAllCaches } from "../actions";

export default function CacheManager() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function handleClear() {
    setMessage(null);
    startTransition(async () => {
      const result = await clearAllCaches();
      if (result.ok) {
        setMessage({ type: "ok", text: "All site caches were cleared." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-900">Cached site data</p>
          <p className="mt-1 text-sm text-zinc-600">
            Clears layout, theme, font, analytics, and geo listing caches, then
            revalidates all public routes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Clearing…" : "Clear cache"}
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Site data is cached in each server instance for a short time. Clearing
        here empties the current instance and revalidates route cache; a fresh
        instance will rebuild from the database.
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
  );
}

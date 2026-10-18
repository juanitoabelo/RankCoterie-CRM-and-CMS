"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDefaultListingTemplate } from "../actions";

/** Clears the site-wide default template override → built-in System Default. */
export default function UseSystemDefaultButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await setDefaultListingTemplate(null);
            if (!result.ok) setError(result.error);
            else router.refresh();
          });
        }}
        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-70"
        title="Remove the default template override and use the built-in system layout"
      >
        {pending ? "Restoring…" : "Use System Default"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </>
  );
}

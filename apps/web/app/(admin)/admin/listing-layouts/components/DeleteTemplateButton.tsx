"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteListingTemplate } from "../actions";

export default function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete template "${name}"? Listings using it fall back to the default layout.`)) return;
          startTransition(async () => {
            const result = await deleteListingTemplate(id);
            if (!result.ok) setError(result.error);
            else router.refresh();
          });
        }}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </>
  );
}

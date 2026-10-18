"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDefaultListingTemplate } from "../actions";

export default function SetDefaultButton({
  id,
  name,
  isDefault,
}: {
  id: string;
  name: string;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        disabled={pending || isDefault}
        onClick={() => {
          startTransition(async () => {
            const result = await setDefaultListingTemplate(id);
            if (!result.ok) setError(result.error);
            else router.refresh();
          });
        }}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium disabled:cursor-default ${
          isDefault
            ? "bg-amber-100 text-amber-800"
            : "border border-amber-300 text-amber-700 hover:bg-amber-50"
        } disabled:opacity-70`}
        title={
          isDefault
            ? "This template is the site-wide default"
            : `Use “${name}” for every listing without an explicit template`
        }
      >
        {isDefault ? "✓ Default" : pending ? "Setting…" : "Set as Default"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </>
  );
}

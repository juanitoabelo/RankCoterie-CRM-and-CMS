"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/app/(admin)/admin/products/actions";

export default function DeleteProductButton({
  id,
  name,
  action,
}: {
  id: string;
  name: string;
  action: (id: string) => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        setError(null);
        startTransition(async () => {
          try {
            const result = await action(id);
            if (result.ok) {
              router.refresh();
            } else {
              setError(result.error);
            }
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete product.");
          }
        });
      }}
      className="text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {isPending ? "Deleting..." : "Delete"}
      {error && <span className="ml-1 text-xs">{error}</span>}
    </button>
  );
}

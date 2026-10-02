"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTaxRate } from "@/app/(admin)/admin/tax/actions";

export default function DeleteTaxRateButton({ id, label }: { id: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onDelete = () => {
    if (!window.confirm(`Delete tax rate ${label}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTaxRate(id);
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <span>
      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="text-sm font-medium text-zinc-400 hover:text-red-600 disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="ml-2 block text-xs text-red-600">{error}</span>}
    </span>
  );
}

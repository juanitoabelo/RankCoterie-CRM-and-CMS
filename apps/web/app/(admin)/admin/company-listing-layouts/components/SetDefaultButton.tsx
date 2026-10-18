"use client";

import { useState, useTransition } from "react";
import { setDefaultCompanyListingTemplate } from "../actions";

interface Props {
  id: string;
  name: string;
  isDefault: boolean;
}

export default function SetDefaultButton({ id, name, isDefault }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const handleToggle = () => {
    startTransition(async () => {
      const res = await setDefaultCompanyListingTemplate(isDefault ? null : id);
      if (res.ok) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  if (isDefault) {
    return (
      <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold uppercase text-amber-700">
        Default
      </span>
    );
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        Set as default
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-600">Make &ldquo;{name}&rdquo; the default?</span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
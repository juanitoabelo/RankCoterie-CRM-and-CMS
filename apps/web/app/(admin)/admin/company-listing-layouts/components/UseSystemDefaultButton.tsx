"use client";

import { useState, useTransition } from "react";
import { setDefaultCompanyListingTemplate } from "../actions";

export default function UseSystemDefaultButton() {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const handleUseSystem = () => {
    startTransition(async () => {
      const res = await setDefaultCompanyListingTemplate(null);
      if (res.ok) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        Use system default
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-600">Remove default template & use built-in layout?</span>
      <button
        type="button"
        onClick={handleUseSystem}
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
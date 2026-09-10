"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMenu, type ActionResult } from "../actions";
import { MENU_LOCATIONS, MENU_LOCATION_LABELS } from "../constants";
import type { MenuLocation } from "@prisma/client";

export default function NewMenuForm() {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await createMenu(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/menus");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 max-w-xl space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Menu created." : message.error}
        </p>
      )}

      {/* Menu Name */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Menu Name <span className="text-xs text-zinc-400">e.g., Main Navigation, Footer Links</span>
        </label>
        <input
          name="name"
          required
          placeholder="Enter menu name"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Location */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Location <span className="text-xs text-zinc-400">Where this menu will be displayed</span>
        </label>
        <select
          name="location"
          defaultValue="HEADER"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          {MENU_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>{MENU_LOCATION_LABELS[loc]}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
      >
        {isPending ? "Creating..." : "CREATE NEW MENU"}
      </button>
    </form>
  );
}

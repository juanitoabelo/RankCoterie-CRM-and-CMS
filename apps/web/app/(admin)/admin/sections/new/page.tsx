"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSection, type ActionResult } from "../actions";

export default function NewSectionPage() {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    formData.set("slug", slug);
    formData.set("status", "LIVE");
    setMessage(null);
    startTransition(async () => {
      const res = await createSection(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/sections");
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/sections" className="hover:text-zinc-700">Sections</a> /{" "}
        <span className="text-zinc-700">Add New Section</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New Section/Category</h1>

      <form action={onSubmit} className="mt-8 space-y-6 rounded-xl border border-zinc-200 bg-white p-5">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Section created." : message.error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-800">
            New Section/Category Title: <span className="text-xs text-zinc-400 italic">See Tooltip before saving!</span>
          </label>
          <input
            name="title"
            required
            placeholder="Enter section title"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "SAVE NEW SECTION"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGeoCategory, type ActionResult } from "../actions";
import RichTextarea from "@/components/admin/RichTextarea";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

export default function NewGeoCategoryPage() {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await createGeoCategory(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/geo-categories");
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/geo-categories" className="hover:text-zinc-700">GeoCategory Pages</a> /{" "}
        <span className="text-zinc-700">Add New</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New GeoCategory</h1>

      <form action={onSubmit} className="mt-8 space-y-8">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Created." : message.error}
          </p>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">
            New GeoCategory Title/URL <span className="text-xs text-zinc-400">(use dashes between words)</span>
          </label>
          <input name="title" required placeholder="e.g. Therapeutic Services for Young Adults" className={inputCls} />
          <label className="mt-3 block text-sm font-medium text-zinc-800">
            Slug <span className="text-xs text-zinc-400">(lowercase, hyphens)</span>
          </label>
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="e.g. therapeutic-services-for-young-adults" className={inputCls} />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">New Category Content (Parent Page)</h2>
          <RichTextarea name="description" label="Category Parent Content" placeholder="Write parent page content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory State Page (Intro)</h2>
          <RichTextarea name="stateInit" label="State Page Intro" placeholder="Write state intro content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory State Page (Static)</h2>
          <RichTextarea name="stateDesc" label="State Page Static Content" placeholder="Write state static content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory City Page (Intro)</h2>
          <RichTextarea name="cityInit" label="City Page Intro" placeholder="Write city intro content..." />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-6">
          <h2 className="text-sm font-medium text-zinc-900">GeoCategory City Page (Static)</h2>
          <RichTextarea name="cityDesc" label="City Page Static Content" placeholder="Write city static content..." />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "SAVE NEW GEOCATEGORY"}
        </button>
      </form>
    </div>
  );
}

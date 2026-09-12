"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRegion, type ActionResult } from "../actions";
import { US_STATES } from "../constants";
import RichTextarea from "@/components/admin/RichTextarea";
import WordCounter from "@/components/admin/WordCounter";

export default function NewRegionForm() {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [box1, setBox1] = useState("");
  const [box2, setBox2] = useState("");

  function onSubmit(formData: FormData) {
    const state = String(formData.get("state") ?? "").trim().toUpperCase();
    const city = String(formData.get("city") ?? "").trim();
    if (!state) return;
    formData.set("custom1", box1);
    formData.set("custom2", box2);
    setMessage(null);
    startTransition(async () => {
      const res = await createRegion(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/regions");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Region created." : message.error}
        </p>
      )}

      {/* Choose Region State */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Choose Region State</label>
        <select
          name="state"
          required
          defaultValue="AL"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          {Object.entries(US_STATES).map(([abbr, name]) => (
            <option key={abbr} value={abbr}>{abbr}</option>
          ))}
        </select>
      </div>

      {/* City Input */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Add Region: City, Community, or County
        </label>
        <p className="mt-1 text-xs text-red-600">
          Double-check to be sure you spell the new region correctly, as this will generate both the{" "}
          <span className="font-semibold">page title</span> and <span className="font-semibold">page url</span> (web address)
        </p>
        <input
          name="city"
          placeholder="Enter city, community, or county name"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Region Content Box 1 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <label className="block text-sm font-semibold text-zinc-900">
          Region Content Box 1 <span className="text-blue-600">ⓘ</span>
        </label>
        <input type="hidden" name="custom1" value={box1} />
        <RichTextarea
          name="_box1"
          label=""
          value={box1}
          onChange={setBox1}
          placeholder="Write content for region box 1..."
        />
      </div>

      {/* Region Content Box 2 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <label className="block text-sm font-semibold text-zinc-900">
          Region Content Box 2 <span className="text-blue-600">ⓘ</span>
        </label>
        <input type="hidden" name="custom2" value={box2} />
        <RichTextarea
          name="_box2"
          label=""
          value={box2}
          onChange={setBox2}
          placeholder="Write content for region box 2..."
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
      >
        {isPending ? "Saving..." : "SAVE NEW REGION"}
      </button>
    </form>
  );
}

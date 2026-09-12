"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateRegion, deleteRegion, type ActionResult } from "../../actions";
import { US_STATES, AREA_PARTS } from "../../constants";
import RichTextarea from "@/components/admin/RichTextarea";
import WordCounter from "@/components/admin/WordCounter";

interface Region {
  id: string;
  state: string;
  stateFull: string;
  city?: string | null;
  areaPart?: string | null;
  custom1?: string | null;
  custom2?: string | null;
}

export default function RegionEditForm({ region }: { region: Region }) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(region.state);
  const [city, setCity] = useState(region.city ?? "");
  const [box1, setBox1] = useState(region.custom1 ?? "");
  const [box2, setBox2] = useState(region.custom2 ?? "");

  const regionLabel = city ? `${state} - ${city}` : US_STATES[state] ?? state;

  function onSubmit(formData: FormData) {
    formData.set("state", state);
    formData.set("city", city);
    formData.set("custom1", box1);
    formData.set("custom2", box2);
    setMessage(null);
    startTransition(async () => {
      const res = await updateRegion(region.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this region?")) return;
    startTransition(async () => {
      await deleteRegion(region.id, new FormData());
      router.push("/admin/regions");
    });
  }

  const combinedContent = `${box1} ${box2}`;

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      {/* Region State */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Region State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          {Object.entries(US_STATES).map(([abbr, name]) => (
            <option key={abbr} value={abbr}>{abbr}</option>
          ))}
        </select>
      </div>

      {/* Region State Area */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Region State Area <span className="text-red-500">⚠</span>{" "}
          <span className="text-xs text-red-600">
            Select &apos;State Area&apos; for City, Community, or County regions <strong>ONLY</strong>. Leave as --None-- for State regions.
          </span>
        </label>
        <select
          name="areaPart"
          defaultValue={region.areaPart ?? ""}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">--None--</option>
          {AREA_PARTS.map((ap) => (
            <option key={ap} value={ap}>{ap}</option>
          ))}
        </select>
      </div>

      {/* Region City */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Region City, Community, or County
        </label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city, community, or county name"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Region Content Box 1 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <label className="block text-sm font-semibold text-zinc-900">Region Content Box 1</label>
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
        <label className="block text-sm font-semibold text-zinc-900">Region Content Box 2</label>
        <input type="hidden" name="custom2" value={box2} />
        <RichTextarea
          name="_box2"
          label=""
          value={box2}
          onChange={setBox2}
          placeholder="Write content for region box 2..."
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : `UPDATE/SAVE ${regionLabel.toUpperCase()} REGION`}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          Delete
        </button>
      </div>

      <div className="mt-6">
        <WordCounter source={combinedContent} />
      </div>
    </form>
  );
}

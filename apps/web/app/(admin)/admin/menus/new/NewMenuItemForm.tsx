"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMenuItem, getParentItemOptions, type ActionResult } from "../actions";
import WordCounter from "@/components/admin/WordCounter";

interface MenuOption {
  id: string;
  name: string;
  location: string;
}

interface ParentOption {
  id: string;
  label: string;
}

export default function NewMenuItemForm({
  menuOptions,
}: {
  menuOptions: MenuOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState(menuOptions[0]?.id ?? "");
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // Fetch parent options when menu changes
  useEffect(() => {
    if (!selectedMenuId) {
      setParentOptions([]);
      return;
    }
    setLoadingParents(true);
    getParentItemOptions(selectedMenuId)
      .then((options) => {
        setParentOptions(options);
        setLoadingParents(false);
      })
      .catch(() => {
        setParentOptions([]);
        setLoadingParents(false);
      });
  }, [selectedMenuId]);

  function onSubmit(formData: FormData) {
    formData.set("menuId", selectedMenuId);
    setMessage(null);
    startTransition(async () => {
      const res = await createMenuItem(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/menus");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Menu item created." : message.error}
        </p>
      )}

      {/* Menu */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Menu</label>
        <select
          value={selectedMenuId}
          onChange={(e) => setSelectedMenuId(e.target.value)}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          {menuOptions.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.location})</option>
          ))}
        </select>
      </div>

      {/* Item Parent/Dropdown */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Item Parent/Dropdown <span className="text-xs text-zinc-400">&quot;Choose an existing menu item or &apos;Root&apos; for a new item (no dropdown).&quot;</span>
        </label>
        <select
          name="parentId"
          defaultValue=""
          disabled={loadingParents}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Root</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {loadingParents && <p className="mt-1 text-xs text-zinc-400">Loading parent options...</p>}
      </div>

      {/* Item Type */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Item Type <span className="text-xs text-zinc-400">&quot;Choose &apos;Feed&apos; if you want automated, dynamic links from an article category/section.</span>
        </label>
        <select
          name="itemType"
          defaultValue="LINK"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="LINK">Link</option>
          <option value="FEED">Feed</option>
        </select>
      </div>

      {/* Item Text */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Item Text <span className="text-xs text-zinc-400">*For best front end display, try to keep this at 20 characters or less.</span>
        </label>
        <input
          name="label"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Menu item text"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Item Link/URL */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Item Link/URL</label>
        <input
          name="href"
          placeholder="/page-url"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Target */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Open Link In <span className="text-xs text-zinc-400">Optional: open in new tab</span>
        </label>
        <select
          name="target"
          defaultValue=""
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Same Window</option>
          <option value="_blank">New Tab (_blank)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
      >
        {isPending ? "Saving..." : "SAVE NEW MENU ITEM"}
      </button>

      <div className="mt-6">
        <WordCounter source={label} />
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMenuItem, deleteMenuItem, type ActionResult } from "../../../actions";
import WordCounter from "@/components/admin/WordCounter";

interface MenuItemData {
  id: string;
  label: string;
  href: string;
  order: number;
  itemType: string;
  parentId?: string | null;
  menuId: string;
  target?: string | null;
  menu: { id: string; name: string; location: string };
}

interface ParentOption {
  id: string;
  label: string;
}

export default function MenuItemEditForm({
  item,
  parentOptions,
}: {
  item: MenuItemData;
  parentOptions: ParentOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState(item.label);

  function onSubmit(formData: FormData) {
    formData.set("label", label);
    setMessage(null);
    startTransition(async () => {
      const res = await updateMenuItem(item.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    startTransition(async () => {
      await deleteMenuItem(item.id);
      router.push("/admin/menus");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      {/* Item Parent/Dropdown */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Item Parent/Dropdown</label>
        <select
          name="parentId"
          defaultValue={item.parentId ?? ""}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Root</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* Item Type */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Item Type <span className="text-xs text-zinc-400">&quot;Choose &apos;Feed&apos; if you want automated, dynamic links from an article category/section.</span>
        </label>
        <select
          name="itemType"
          defaultValue={item.itemType}
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
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Item Link/URL */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Item Link/URL</label>
        <input
          name="href"
          defaultValue={item.href}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Sort Order */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Sort Order <span className="text-xs text-blue-600">Order of display</span>
        </label>
        <input
          name="order"
          type="number"
          defaultValue={item.order}
          className="mt-2 w-32 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      {/* Target */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          Open Link In <span className="text-xs text-zinc-400">Optional: open in new tab</span>
        </label>
        <select
          name="target"
          defaultValue={item.target ?? ""}
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">Same Window</option>
          <option value="_blank">New Tab (_blank)</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "UPDATE/SAVE MENU ITEM"}
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
        <WordCounter source={label} />
      </div>
    </form>
  );
}

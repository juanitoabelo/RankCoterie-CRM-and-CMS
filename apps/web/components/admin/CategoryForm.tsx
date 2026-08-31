"use client";

import { useState, useTransition } from "react";
import {
  createCategory,
  updateCategory,
  type ActionResult,
} from "@/app/(admin)/admin/categories/actions";

export interface CategoryFormCategory {
  id: string;
  slug: string;
  title: string;
}

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";
const STATUSES = ["LIVE", "DRAFT", "DISABLED"];

export default function CategoryForm({
  category,
  allCategories,
  submitLabel,
}: {
  category: CategoryFormCategory | null;
  allCategories: CategoryFormCategory[];
  submitLabel: string;
}) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const action = category
    ? updateCategory.bind(null, category.id)
    : createCategory;

  const onSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const res = await action(formData);
      setMessage(res);
    });
  };

  const parentOptions = allCategories.filter((c) => c.id !== category?.id);

  return (
    <form action={onSubmit} className="space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Title *</label>
          <input
            name="title"
            required
            defaultValue={category?.title ?? ""}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Slug * (lowercase, hyphens)</label>
          <input
            name="slug"
            required
            defaultValue={category?.slug ?? ""}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue=""
          className={inputCls}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Parent category</label>
          <select name="parentId" defaultValue="" className={inputCls}>
            <option value="">None (top-level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select
            name="status"
            defaultValue={category ? "LIVE" : "LIVE"}
            className={inputCls}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        {isPending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

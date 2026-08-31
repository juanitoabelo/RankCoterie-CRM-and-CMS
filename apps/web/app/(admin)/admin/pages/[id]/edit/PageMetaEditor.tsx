"use client";

import { useState, useTransition } from "react";
import { updatePageMeta, type ActionResult } from "../../actions";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export default function PageMetaEditor({
  page,
}: {
  page: {
    id: string;
    name: string;
    slug: string;
    title: string;
    status: string;
  };
}) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const action = updatePageMeta.bind(null, page.id);

  const onSubmit = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const res = await action(formData);
      setMessage(res);
    });
  };

  return (
    <form action={onSubmit} className="mt-3">
      {message && (
        <p className={`mb-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={labelCls}>Name</label>
          <input name="name" required defaultValue={page.name} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            defaultValue={page.slug}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Title</label>
          <input name="title" defaultValue={page.title} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue={page.status} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="LIVE">Live</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
      >
        {isPending ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}

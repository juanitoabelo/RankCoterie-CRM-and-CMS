"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPage, type ActionResult } from "../actions";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export default function NewPageForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const res = await createPage(formData);
      if (res.ok) {
        router.push("/admin/pages");
      }
    });
  };

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Internal name *</label>
          <input name="name" required className={inputCls} placeholder="e.g. About Us" />
        </div>
        <div>
          <label className={labelCls}>URL slug * (lowercase, hyphens)</label>
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            className={inputCls}
            placeholder="e.g. about-us"
          />
        </div>
        <div>
          <label className={labelCls}>Page title</label>
          <input name="title" className={inputCls} placeholder="Displayed in browser tab" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue="DRAFT" className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="LIVE">Live</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        {isPending ? "Creating..." : "Create page & open editor"}
      </button>
    </form>
  );
}

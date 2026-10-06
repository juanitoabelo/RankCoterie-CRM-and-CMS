"use client";

import { useState, useTransition } from "react";
import { assignGeoCategoryTemplateAction } from "@/app/(admin)/admin/geo-category-template/actions";

interface TemplateOption {
  id: string;
  name: string;
  layout: string;
  isDefault: boolean;
}

export default function GeoTemplateAssignmentCard({
  categoryId,
  templates,
  assignedTemplateId,
}: {
  categoryId: string;
  templates: TemplateOption[];
  assignedTemplateId: string | null;
}) {
  const [value, setValue] = useState(assignedTemplateId ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultTemplate = templates.find((t) => t.isDefault);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const res = await assignGeoCategoryTemplateAction(categoryId, value === "" ? null : value);
      setMessage(
        res.ok
          ? { ok: true, text: "Saved." }
          : { ok: false, text: res.error },
      );
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Single Page Template</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Choose which Geo Category Custom Single Page template renders this
          category&apos;s parent page. Region pages keep the default design.
        </p>
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-zinc-800">
            Parent page template
          </label>
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">
              Default
              {defaultTemplate ? ` (${defaultTemplate.name})` : ""}
            </option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.layout === "SIDEBAR" ? " — Right Sidebar" : " — Fullwidth"}
                {t.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
      </div>

      {message && (
        <p className={`text-xs ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

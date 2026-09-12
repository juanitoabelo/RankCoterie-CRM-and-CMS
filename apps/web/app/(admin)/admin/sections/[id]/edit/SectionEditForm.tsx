"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSection, deleteSection, type ActionResult } from "../../actions";

interface Section {
  id: string;
  slug: string;
  title: string;
  heading?: string | null;
  body?: string | null;
  order: number;
  status: string;
}

export default function SectionEditForm({ section }: { section: Section }) {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(section.title);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await updateSection(section.id, formData);
      setMessage(res);
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this section?")) return;
    startTransition(async () => {
      await deleteSection(section.id);
      router.push("/admin/sections");
    });
  }

  const previewUrl = `/feed/${section.slug}`;

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/sections" className="hover:text-zinc-700">Sections</a> /{" "}
        <span className="text-zinc-700">Edit</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Edit: <span className="text-blue-600">{title}</span> <span className="text-sm font-normal text-zinc-500">(ID #{section.id.slice(0, 8)})</span>
      </h1>

      <form action={onSubmit} className="mt-8 space-y-6 rounded-xl border border-zinc-200 bg-white p-5">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Saved." : message.error}
          </p>
        )}
        <input type="hidden" name="id" value={section.id} />
        <input type="hidden" name="slug" value={section.slug} />

        <div>
          <label className="block text-sm font-medium text-zinc-800">Section Page URL</label>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <span className="text-sm text-zinc-600">{previewUrl}/</span>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              – Preview Section Page 👁
            </a>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-800">Section Name</label>
          <input
            name="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : `UPDATE/SAVE ${title.toUpperCase()}`}
        </button>
      </form>
    </div>
  );
}

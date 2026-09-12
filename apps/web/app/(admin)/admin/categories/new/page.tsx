"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCategory, type ActionResult } from "../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import WordCounter from "@/components/admin/WordCounter";

export default function NewTopicPage() {
  const router = useRouter();
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");

  function onSubmit(formData: FormData) {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    formData.set("slug", slug);
    formData.set("description", content);
    setMessage(null);
    startTransition(async () => {
      const res = await createCategory(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/categories");
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/categories" className="hover:text-zinc-700">Topics</a> /{" "}
        <span className="text-zinc-700">Add New Topic</span>
      </p>
      <div className="flex items-start justify-between">
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New Topic</h1>
        <span className="text-xs text-zinc-400">Help with SEO (search engine optimization)</span>
      </div>

      <form action={onSubmit} className="mt-8 space-y-6">
        {message && (
          <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
            {message.ok ? "Topic created." : message.error}
          </p>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <label className="block text-sm font-medium text-zinc-800">
            New Topic Title/URL: <span className="text-xs text-zinc-400 italic">See Tooltip before saving!</span>
          </label>
          <input
            name="title"
            required
            placeholder="Enter topic title"
            className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <label className="block text-sm font-medium text-zinc-800">New Topic Content</label>
          <input type="hidden" name="description" value={content} />
          <RichTextarea
            name="_content"
            label=""
            value={content}
            onChange={setContent}
            placeholder="Write your topic content..."
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "Saving..." : "SAVE NEW TOPIC"}
        </button>
      </form>

      <div className="mt-6">
        <WordCounter source={content} />
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSubTopic, type ActionResult } from "../actions";
import RichTextarea from "@/components/admin/RichTextarea";
import WordCounter from "@/components/admin/WordCounter";

interface TopicOption {
  id: string;
  title: string;
}

export default function NewSubTopicForm({
  topicOptions,
}: {
  topicOptions: TopicOption[];
}) {
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
    formData.set("body", content);
    setMessage(null);
    startTransition(async () => {
      const res = await createSubTopic(formData);
      setMessage(res);
      if (res.ok) router.push("/admin/templates");
    });
  }

  return (
    <form action={onSubmit} className="mt-8 space-y-6">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "SubTopic created." : message.error}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">
          New SubTopic Title/URL: <span className="text-xs text-zinc-400 italic">See Tooltip before saving!</span>
        </label>
        <input
          name="title"
          required
          placeholder="Enter subtopic title"
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <label className="block text-sm font-medium text-zinc-800">New SubTopic Content</label>
        <input type="hidden" name="body" value={content} />
        <RichTextarea
          name="_content"
          label=""
          value={content}
          onChange={setContent}
          placeholder="Write your subtopic content..."
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-sm font-medium text-zinc-800">Choose Related Topic</label>
        <select
          name="categoryId"
          defaultValue=""
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">— Select Topic —</option>
          {topicOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
      >
        {isPending ? "Saving..." : "SAVE NEW SUBTOPIC PAGE"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";

type Comment = {
  id: string;
  name: string;
  body: string;
  createdAt: Date;
};

export default function CustomPostComments({
  typeSlug,
  postSlug,
  comments,
}: {
  typeSlug: string;
  postSlug: string;
  comments: Comment[];
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      const response = await fetch(
        `/api/custom-post/${encodeURIComponent(typeSlug)}/${encodeURIComponent(postSlug)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("name"),
            email: formData.get("email"),
            body: formData.get("body"),
          }),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = result && typeof result === "object" && "error" in result
          ? String(result.error)
          : "Could not submit your comment.";
        setMessage(errorMessage);
        return;
      }
      form.reset();
      setMessage("Thanks. Your comment is awaiting moderation.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit your comment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-12 border-t border-zinc-200 pt-8">
      <h2 className="text-xl font-semibold text-zinc-900">Comments</h2>
      {comments.length > 0 ? (
        <ul className="mt-4 space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-zinc-200 p-4">
              <p className="font-medium text-zinc-800">{comment.name}</p>
              <time dateTime={comment.createdAt.toISOString()} className="mt-1 block text-xs text-zinc-500">
                {comment.createdAt.toLocaleDateString()}
              </time>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-zinc-500">No comments yet.</p>}

      <form onSubmit={submit} className="mt-6 grid max-w-2xl gap-3">
        <label className="text-sm font-medium text-zinc-700">Name
          <input name="name" required maxLength={100} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-zinc-700">Email
          <input name="email" type="email" required maxLength={254} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-zinc-700">Comment
          <textarea name="body" required maxLength={5000} rows={5} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        {message && <p role="status" className="text-sm text-zinc-600">{message}</p>}
        <button disabled={pending} className="w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "Submitting…" : "Submit comment"}
        </button>
      </form>
    </section>
  );
}

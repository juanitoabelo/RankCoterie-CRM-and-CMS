"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCustomPostComment, updateCustomPostCommentStatus } from "../../../custom-fields/actions";

type Comment = {
  id: string;
  name: string;
  email: string;
  body: string;
  status: string;
  createdAt: Date;
  post: { title: string; slug: string };
};

export default function CommentsModeration({
  postTypeId,
  postTypeSlug,
  comments,
}: {
  postTypeId: string;
  postTypeSlug: string;
  comments: Comment[];
}) {
  const [rows, setRows] = useState(comments);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function changeStatus(commentId: string, status: string) {
    setError("");
    startTransition(async () => {
      try {
        const result = await updateCustomPostCommentStatus(postTypeId, commentId, status);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRows((current) => current.map((comment) => comment.id === commentId ? { ...comment, status } : comment));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not update comment.");
      }
    });
  }

  function remove(commentId: string) {
    setError("");
    startTransition(async () => {
      try {
        const result = await deleteCustomPostComment(postTypeId, commentId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setRows((current) => current.filter((comment) => comment.id !== commentId));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete comment.");
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {rows.map((comment) => (
        <article key={comment.id} className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-zinc-900">{comment.name} <span className="font-normal text-zinc-500">({comment.email})</span></p>
              <p className="mt-1 text-xs text-zinc-500">
                On <Link href={`/custom-post/${encodeURIComponent(postTypeSlug)}/${encodeURIComponent(comment.post.slug)}`} className="underline">{comment.post.title}</Link>
                {" · "}{comment.createdAt.toLocaleString()} · {comment.status}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {comment.status !== "APPROVED" && <button type="button" disabled={pending} onClick={() => changeStatus(comment.id, "APPROVED")} className="text-sm text-green-700 hover:underline disabled:opacity-50">Approve</button>}
              {comment.status !== "PENDING" && <button type="button" disabled={pending} onClick={() => changeStatus(comment.id, "PENDING")} className="text-sm text-amber-700 hover:underline disabled:opacity-50">Pending</button>}
              {comment.status !== "SPAM" && <button type="button" disabled={pending} onClick={() => changeStatus(comment.id, "SPAM")} className="text-sm text-zinc-600 hover:underline disabled:opacity-50">Mark spam</button>}
              <button type="button" disabled={pending} onClick={() => remove(comment.id)} className="text-sm text-red-700 hover:underline disabled:opacity-50">Delete</button>
            </div>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{comment.body}</p>
        </article>
      ))}
      {rows.length === 0 && <p className="text-sm text-zinc-500">No comments for this custom post type.</p>}
    </div>
  );
}

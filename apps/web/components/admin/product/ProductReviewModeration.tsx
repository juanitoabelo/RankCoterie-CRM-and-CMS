"use client";

import { useState, useTransition } from "react";
import { moderateProductReview } from "@/app/(admin)/admin/products/review-actions";

export type ReviewModerationRow = {
  id: string;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  createdAt: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export default function ProductReviewModeration({
  reviews,
}: {
  reviews: ReviewModerationRow[];
}) {
  const [rows, setRows] = useState(reviews);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (rows.length === 0) return null;

  function moderate(id: string, status: "APPROVED" | "REJECTED") {
    setPendingId(id);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await moderateProductReview(id, status);
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        setRows((current) =>
          current.map((row) => (row.id === id ? { ...row, status } : row)),
        );
      } catch {
        setMessage("Could not update this review.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-zinc-900">Product reviews</h2>
      <p className="mt-1 text-sm text-zinc-500">Approve or reject customer submissions.</p>
      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}
      <ul className="mt-4 divide-y divide-zinc-200">
        {rows.map((review) => (
          <li key={review.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">{review.title || "Review"}</span>
                <span className="text-xs text-amber-600">{"★".repeat(review.rating)}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                  {review.status.toLowerCase()}
                </span>
              </div>
              {review.body && <p className="mt-1 text-sm text-zinc-600">{review.body}</p>}
              <p className="mt-1 text-xs text-zinc-400">
                {review.authorName} · {review.authorEmail} · {formatDate(review.createdAt)}
              </p>
            </div>
            <div className="flex items-start gap-2">
              {review.status !== "APPROVED" && (
                <button
                  type="button"
                  disabled={pendingId === review.id}
                  onClick={() => moderate(review.id, "APPROVED")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                >
                  Approve
                </button>
              )}
              {review.status !== "REJECTED" && (
                <button
                  type="button"
                  disabled={pendingId === review.id}
                  onClick={() => moderate(review.id, "REJECTED")}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 disabled:opacity-60"
                >
                  Reject
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

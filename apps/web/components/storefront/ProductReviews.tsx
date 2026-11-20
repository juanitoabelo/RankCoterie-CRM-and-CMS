"use client";

import { useMemo, useState, useTransition } from "react";
import { submitProductReview } from "@/app/(site)/[slug]/actions";
import { useProductTemplateContext } from "./ProductTemplateContext";

function Stars({ rating, size = "text-base" }: { rating: number; size?: string }) {
  return (
    <span className={`pdp-stars ${size}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className={value <= Math.round(rating) ? "pdp-star-on" : "pdp-star-off"}>
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

export default function ProductReviews() {
  const context = useProductTemplateContext();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const product = context?.product;
  const reviews = useMemo(() => product?.reviews ?? [], [product?.reviews]);

  const summary = useMemo(() => {
    const count = reviews.length > 0 ? reviews.length : product?.reviewCount ?? 0;
    const average =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : product?.averageRating ?? 0;
    const distribution = [5, 4, 3, 2, 1].map((value) => ({
      value,
      count: reviews.filter((review) => review.rating === value).length,
    }));
    return { count, average, distribution };
  }, [reviews, product]);

  if (!context) return null;

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    const formData = new FormData(event.currentTarget);
    formData.set("productId", context.product.id);
    formData.set("slug", context.product.slug);
    formData.set("rating", String(rating));
    startTransition(async () => {
      try {
        const result = await submitProductReview(formData);
        setMessage(
          result.ok
            ? { ok: true, text: result.message }
            : { ok: false, text: result.error },
        );
        if (result.ok) event.currentTarget.reset();
      } catch {
        setMessage({ ok: false, text: "Could not submit your review. Please try again." });
      }
    });
  };

  return (
    <section className="pdp-reviews" aria-labelledby="pdp-reviews-title">
      <div className="pdp-reviews-summary">
        <div>
          <p className="pdp-eyebrow">Customer voices</p>
          <h2 id="pdp-reviews-title" className="pdp-section-title">
            Reviews
          </h2>
          {summary.count > 0 ? (
            <div className="mt-3 flex items-center gap-3">
              <Stars rating={summary.average} size="text-xl" />
              <span className="text-sm text-zinc-600">
                {summary.average.toFixed(1)} · {summary.count} {summary.count === 1 ? "review" : "reviews"}
              </span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No approved reviews yet.</p>
          )}
        </div>
        {summary.count > 0 && (
          <div className="pdp-rating-bars">
            {summary.distribution.map((row) => (
              <div key={row.value}>
                <span>{row.value}★</span>
                <span className="pdp-rating-track">
                  <span
                    className="pdp-rating-fill"
                    style={{ width: `${summary.count ? (row.count / summary.count) * 100 : 0}%` }}
                  />
                </span>
                <span>{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <ul className="pdp-review-list">
          {reviews.map((review) => (
            <li key={review.id} className="pdp-review-item">
              <Stars rating={review.rating} />
              {review.title && <h3>{review.title}</h3>}
              {review.body && <p className="whitespace-pre-wrap text-sm text-zinc-600">{review.body}</p>}
              <p className="pdp-review-meta">
                {review.authorName}
                {review.createdAt ? ` · ${formatDate(review.createdAt)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {context.product.reviewsAllowed && context.interactive && (
        <form onSubmit={onSubmit} className="pdp-review-form">
          <h3 className="pdp-section-title">Write a review</h3>
          <fieldset>
            <legend>Rating</legend>
            <div className="pdp-rating-input">
              {[1, 2, 3, 4, 5].map((value) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                  />
                  <span className={value <= rating ? "pdp-star-on" : "pdp-star-off"}>★</span>
                  <span className="sr-only">{value} stars</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Your name
            <input name="authorName" required minLength={2} maxLength={120} autoComplete="name" />
          </label>
          <label>
            Email
            <input name="authorEmail" type="email" required autoComplete="email" />
          </label>
          <label>
            Title
            <input name="title" maxLength={160} />
          </label>
          <label>
            Review
            <textarea name="body" rows={4} maxLength={4000} />
          </label>
          <button type="submit" className="pdp-secondary-button" disabled={isPending}>
            {isPending ? "Submitting…" : "Submit review"}
          </button>
          {message && (
            <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
          <p className="text-xs text-zinc-500">Reviews are published after moderation.</p>
        </form>
      )}
    </section>
  );
}

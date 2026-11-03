"use client";

/**
 * Indeterminate top-of-viewport progress bar. Rendered by the admin
 * `loading.tsx` boundary — it appears the moment a navigation starts and
 * unmounts when the new page streams in.
 */
export default function RouteProgressBar() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[120]"
      role="status"
      aria-label="Loading page"
    >
      <div className="h-1 w-full overflow-hidden bg-zinc-200/90">
        <div className="route-progress-bar h-full w-1/3 bg-zinc-900" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10" aria-busy="true" aria-live="polite">
      <div className="h-8 w-2/3 max-w-sm animate-pulse rounded bg-zinc-100" />
      <div className="mt-6 space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-100" />
      </div>
      <span className="sr-only">Loading page</span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/**
 * Global busy bar for the admin dashboard.
 *
 * Server actions, uploads and other mutations don't cross the route
 * `loading.tsx` boundary (they re-render in place), so this tracks in-flight
 * mutation requests at the `fetch` layer and shows a top progress bar while
 * any of them are running. Navigations (GET + `RSC: 1`) are intentionally not
 * counted — those are covered by `loading.tsx`.
 */
export default function BusyIndicator() {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const original = window.fetch;
    let inFlight = 0;

    const methodOf = (input: RequestInfo | URL, init?: RequestInit): string => {
      if (init?.method) return init.method.toUpperCase();
      if (typeof Request !== "undefined" && input instanceof Request) {
        return input.method.toUpperCase();
      }
      return "GET";
    };

    const originOf = (input: RequestInfo | URL): string | null => {
      try {
        const url =
          typeof input === "string"
            ? new URL(input, window.location.href)
            : input instanceof URL
              ? input
              : new URL(input.url, window.location.href);
        return url.origin;
      } catch {
        return null;
      }
    };

    window.fetch = async (input, init) => {
      let counted = false;
      try {
        const method = methodOf(input, init);
        if (
          method !== "GET" &&
          method !== "HEAD" &&
          originOf(input) === window.location.origin
        ) {
          inFlight += 1;
          counted = true;
          setBusy(true);
        }
      } catch {
        // Never let bookkeeping break the request itself.
      }
      try {
        return await original(input, init);
      } finally {
        if (counted) {
          inFlight = Math.max(0, inFlight - 1);
          if (inFlight === 0) setBusy(false);
        }
      }
    };

    return () => {
      window.fetch = original;
      inFlight = 0;
      setBusy(false);
    };
  }, []);

  if (!busy) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[120]"
      role="status"
      aria-label="Processing"
    >
      <div className="h-1 w-full overflow-hidden bg-zinc-200/90">
        <div className="route-progress-bar h-full w-1/3 bg-emerald-600" />
      </div>
    </div>
  );
}

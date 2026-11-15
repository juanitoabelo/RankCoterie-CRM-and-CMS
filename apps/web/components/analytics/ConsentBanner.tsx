"use client";

import { setConsent, type ConsentValue } from "@/lib/analytics/client";
import { useAnalyticsConsent } from "@/lib/analytics/use-consent";

export default function ConsentBanner({ enabled }: { enabled: boolean }) {
  const consent = useAnalyticsConsent();

  if (!enabled || consent !== null) return null;

  const choose = (value: ConsentValue) => {
    setConsent(value);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-700">
          We use first-party analytics to understand how people use this site. No advertising cookies are set by this
          tracker.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose("denied")}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("granted")}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </div>
  );
}

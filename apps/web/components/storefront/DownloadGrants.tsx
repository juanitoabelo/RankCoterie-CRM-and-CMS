"use client";

import { useState } from "react";
import type { DownloadGrantView } from "@/lib/checkout/customer-access";
import { reissueDownloadForOrder } from "@/app/(site)/orders/access-actions";

export default function DownloadGrants({
  orderId,
  access,
  grants,
}: {
  orderId: string;
  access: string;
  grants: DownloadGrantView[];
}) {
  const [items, setItems] = useState(grants);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  const reissue = async (grantId: string) => {
    setBusy(grantId);
    setError(null);
    try {
      const result = await reissueDownloadForOrder(orderId, access, grantId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems((current) => current.map((item) => (item.id === grantId ? result.grant : item)));
    } catch {
      setError("Could not refresh the download link. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 text-left">
      <h2 className="text-sm font-semibold text-zinc-900">Your downloads</h2>
      <ul className="mt-3 space-y-3">
        {items.map((grant) => (
          <li key={grant.id} className="rounded-lg border border-zinc-100 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-zinc-900">{grant.name}</span>
              {grant.available ? (
                <a
                  href={grant.downloadPath}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700"
                >
                  Download
                </a>
              ) : (
                <span className="text-xs text-zinc-500">
                  {grant.expired ? "Expired" : "Download limit reached"}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {grant.remaining === null
                ? "Unlimited downloads"
                : `${grant.remaining} download${grant.remaining === 1 ? "" : "s"} remaining`}
              {grant.expiresAt ? ` · expires ${new Date(grant.expiresAt).toLocaleDateString()}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}${grant.downloadPath}`)}
                className="rounded-lg border border-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Copy link
              </button>
              <button
                type="button"
                disabled={busy === grant.id}
                onClick={() => void reissue(grant.id)}
                className="rounded-lg border border-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                {busy === grant.id ? "Refreshing…" : "Refresh link"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </section>
  );
}

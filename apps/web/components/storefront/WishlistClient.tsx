"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { notifyCartUpdated } from "@/lib/cart-event";

const WISHLIST_KEY = "canopy:wishlist";
const WISHLIST_EVENT = "canopy:wishlist-changed";

type WishlistItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  regularPrice: number;
  onSale: boolean;
  imageAssetId: string | null;
  stockStatus: string;
};

function money(value: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
}

function readWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export default function WishlistClient() {
  const [ids, setIds] = useState<string[] | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const sync = () => {
      const next = readWishlistIds();
      setIds(next);
      if (next.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      fetch(`/api/products?ids=${encodeURIComponent(next.join(","))}`)
        .then((res) => res.json())
        .then((json: { items?: WishlistItem[] }) => setItems(json.items ?? []))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    };
    sync();
    window.addEventListener(WISHLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(WISHLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const removeItem = useCallback((id: string) => {
    const next = readWishlistIds().filter((x) => x !== id);
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable — fall through to in-memory removal below.
    }
    setIds(next);
    setItems((prev) => prev.filter((item) => item.id !== id));
    window.dispatchEvent(new Event(WISHLIST_EVENT));
  }, []);

  const addToCart = useCallback(
    async (id: string) => {
      if (adding[id]) return;
      setAdding((prev) => ({ ...prev, [id]: true }));
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: id, quantity: 1 }),
        });
        const json = (await res.json()) as { ok: boolean; itemCount?: number };
        if (json.ok) {
          notifyCartUpdated(json.itemCount);
          setAdded((prev) => ({ ...prev, [id]: true }));
          window.setTimeout(() => setAdded((prev) => ({ ...prev, [id]: false })), 2200);
        }
      } catch {
        // Network failure — button returns to idle.
      } finally {
        setAdding((prev) => ({ ...prev, [id]: false }));
      }
    },
    [adding],
  );

  if (ids !== null && ids.length > 0 && items.length === 0 && !loading) {
    // Ids no longer resolve to published products (deleted/draft/other store).
    return (
      <p className="text-sm text-zinc-500">
        Your wishlist items are no longer available.{" "}
        <Link href="/" className="text-blue-600 hover:underline">
          Continue shopping
        </Link>
      </p>
    );
  }

  if (ids !== null && ids.length === 0 && !loading) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
        <p className="text-zinc-700">Your wishlist is empty.</p>
        <p className="mt-1 text-sm text-zinc-500">
          Tap the heart on any product to save it here for later.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Browse products
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-zinc-200 bg-white p-4">
            <div className="aspect-square rounded-lg bg-zinc-100" />
            <div className="mt-3 h-4 w-3/4 rounded bg-zinc-100" />
            <div className="mt-2 h-4 w-1/3 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const out = item.stockStatus === "OUT_OF_STOCK";
        return (
          <article
            key={item.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white"
          >
            <Link href={`/${item.slug}`} className="block">
              <div className="relative aspect-square bg-zinc-50">
                {item.imageAssetId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/assets/${item.imageAssetId}`}
                    alt={item.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-3xl text-zinc-300">
                    🛒
                  </div>
                )}
                {item.onSale && (
                  <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                    Sale
                  </span>
                )}
                {out && (
                  <span className="absolute left-2 top-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-semibold text-white">
                    Sold out
                  </span>
                )}
              </div>
            </Link>

            <div className="flex flex-1 flex-col p-3">
              <Link href={`/${item.slug}`} className="line-clamp-2 text-sm font-medium text-zinc-900 hover:underline">
                {item.name}
              </Link>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-sm font-semibold ${item.onSale ? "text-red-600" : "text-zinc-900"}`}>
                  {money(item.price)}
                </span>
                {item.onSale && item.regularPrice > item.price && (
                  <span className="text-xs text-zinc-400 line-through">
                    {money(item.regularPrice)}
                  </span>
                )}
              </div>

              <div className="mt-3 flex gap-2">
                {!out && (
                  <button
                    type="button"
                    onClick={() => addToCart(item.id)}
                    disabled={adding[item.id]}
                    className="flex-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                  >
                    {added[item.id] ? "Added ✓" : adding[item.id] ? "Adding…" : "Add to cart"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.name} from wishlist`}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

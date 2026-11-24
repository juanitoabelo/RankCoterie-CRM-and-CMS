"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CART_UPDATED_EVENT } from "@/lib/cart-event";
import {
  WISHLIST_CHANGED_EVENT,
  WISHLIST_STORAGE_KEY,
  parseWishlistIds,
} from "@/lib/wishlist/sync";

export type StorefrontUtilitiesProps = {
  showCart?: boolean;
  showWishlist?: boolean;
  showOrders?: boolean;
  showSearch?: boolean;
  cartLabel?: string;
  wishlistLabel?: string;
  ordersLabel?: string;
  searchLabel?: string;
  showLabels?: boolean;
  showBadges?: boolean;
  showZeroCount?: boolean;
  layout?: "horizontal" | "vertical";
  align?: "start" | "center" | "end";
  gap?: number;
};

type UtilityKind = "cart" | "wishlist" | "orders" | "search";

function UtilityIcon({ kind }: { kind: UtilityKind }) {
  if (kind === "wishlist") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    );
  }
  if (kind === "orders") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6" />
      </svg>
    );
  }
  if (kind === "search") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export default function StorefrontUtilities(props: StorefrontUtilitiesProps) {
  const {
    showCart = true,
    showWishlist = true,
    showOrders = true,
    showSearch = false,
    cartLabel = "Cart",
    wishlistLabel = "Wishlist",
    ordersLabel = "Track order",
    searchLabel = "Search",
    showLabels = false,
    showBadges = true,
    showZeroCount = false,
    layout = "horizontal",
    align = "center",
    gap = 16,
  } = props;
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store" });
      const json = (await res.json()) as { ok?: boolean; itemCount?: number };
      if (json.ok) setCartCount(json.itemCount ?? 0);
    } catch {
      return;
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    const localCount = typeof window === "undefined"
      ? 0
      : parseWishlistIds(window.localStorage.getItem(WISHLIST_STORAGE_KEY)).length;
    setWishlistCount(localCount);
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { items?: unknown[] };
      if (Array.isArray(json.items)) setWishlistCount(json.items.length);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshCart();
      void refreshWishlist();
    });
    const onCartUpdated = (event: Event) => {
      const detail = (event as CustomEvent<number | undefined>).detail;
      if (typeof detail === "number") setCartCount(detail);
      else void refreshCart();
    };
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated);
    window.addEventListener(WISHLIST_CHANGED_EVENT, refreshWishlist);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated);
      window.removeEventListener(WISHLIST_CHANGED_EVENT, refreshWishlist);
    };
  }, [refreshCart, refreshWishlist]);

  const items: Array<{
    kind: UtilityKind;
    href: string;
    label: string;
    count?: number;
  }> = [];
  if (showCart) items.push({ kind: "cart", href: "/cart", label: cartLabel, count: cartCount });
  if (showWishlist) items.push({ kind: "wishlist", href: "/wishlist", label: wishlistLabel, count: wishlistCount });
  if (showOrders) items.push({ kind: "orders", href: "/orders", label: ordersLabel });
  if (showSearch) items.push({ kind: "search", href: "/search", label: searchLabel });
  if (items.length === 0) return null;

  const alignClass = align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start";
  const layoutClass = layout === "vertical" ? "flex-col items-start" : "flex-row flex-wrap items-center";

  return (
    <div
      className={`flex ${layoutClass} ${alignClass}`}
      style={{ gap: `${Math.max(0, gap)}px` }}
      data-lp-el="container"
    >
      {items.map((item) => {
        const badge = item.count !== undefined && (showZeroCount || item.count > 0);
        return (
          <Link
            key={item.kind}
            href={item.href}
            aria-label={badge ? `${item.label}, ${item.count} item${item.count === 1 ? "" : "s"}` : item.label}
            className={`relative inline-flex items-center rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 ${showLabels ? "gap-2 px-2 py-1.5 text-sm" : "h-9 w-9 justify-center"}`}
            data-lp-el="item"
          >
            <UtilityIcon kind={item.kind} />
            {showLabels ? <span data-lp-el="label">{item.label}</span> : null}
            {showBadges && badge ? (
              <span
                className={`inline-flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white ${showLabels ? "ml-auto" : "absolute -right-0.5 -top-0.5 h-4"}`}
                data-lp-el="badge"
              >
                {item.count && item.count > 99 ? "99+" : item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

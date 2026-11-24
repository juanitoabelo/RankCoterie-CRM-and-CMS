"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  WISHLIST_CHANGED_EVENT,
  WISHLIST_STORAGE_KEY,
  mergeWishlistIds,
  parseWishlistIds,
} from "@/lib/wishlist/sync";

type ServerItem = { productId: string; variantId?: string | null };

export default function WishlistSync() {
  const enabled = useRef(false);
  const applying = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readLocal = useCallback(() => {
    if (typeof window === "undefined") return [];
    return parseWishlistIds(window.localStorage.getItem(WISHLIST_STORAGE_KEY));
  }, []);

  const writeLocal = useCallback((ids: string[]) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
    applying.current = true;
    window.dispatchEvent(new Event(WISHLIST_CHANGED_EVENT));
    applying.current = false;
  }, []);

  const push = useCallback(
    async (ids: string[]) => {
      if (!enabled.current) return;
      try {
        await fetch("/api/wishlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: ids }),
        });
      } catch {
        return;
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/wishlist")
      .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
      .then((json: { items?: ServerItem[] } | null) => {
        if (!active || !json) return;
        enabled.current = true;
        const serverIds = (json.items ?? []).map((item) => item.productId);
        const merged = mergeWishlistIds(readLocal(), serverIds);
        if (merged.join("|") !== readLocal().join("|")) writeLocal(merged);
        void push(merged);
      })
      .catch(() => undefined);

    const onChange = () => {
      if (!enabled.current || applying.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void push(readLocal()), 400);
    };
    window.addEventListener(WISHLIST_CHANGED_EVENT, onChange);
    return () => {
      active = false;
      window.removeEventListener(WISHLIST_CHANGED_EVENT, onChange);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [push, readLocal, writeLocal]);

  return null;
}

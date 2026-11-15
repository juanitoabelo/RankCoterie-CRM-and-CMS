"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";

export default function SearchTracker({ query, results }: { query: string; results: number }) {
  const last = useRef<string>("");

  useEffect(() => {
    const key = `${query}:${results}`;
    if (!query.trim() || last.current === key) return;
    last.current = key;
    trackEvent("search", { query: query.trim().slice(0, 200), results });
  }, [query, results]);

  return null;
}

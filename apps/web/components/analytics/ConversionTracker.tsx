"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";

export default function ConversionTracker({
  eventType,
  contentId,
  metadata,
}: {
  eventType: string;
  contentId?: string;
  metadata?: Record<string, unknown>;
}) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(eventType, { contentId, metadata });
  }, [contentId, eventType, metadata]);

  return null;
}

"use client";

import { useSyncExternalStore } from "react";
import {
  ANALYTICS_CONSENT_EVENT,
  ANALYTICS_CONSENT_KEY,
  getConsent,
  type ConsentValue,
} from "./client";

function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === ANALYTICS_CONSENT_KEY) callback();
  };
  window.addEventListener(ANALYTICS_CONSENT_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

function serverSnapshot(): ConsentValue {
  return "granted";
}

export function useAnalyticsConsent(): ConsentValue | null {
  return useSyncExternalStore(subscribe, getConsent, serverSnapshot);
}

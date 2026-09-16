"use client";

import { useEffect } from "react";

export default function JsonLd({ data }: { data: string }) {
  useEffect(() => {
    const id = "json-ld-schema";
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.textContent = data;
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [data]);

  return null;
}

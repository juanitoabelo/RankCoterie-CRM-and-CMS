"use client";

import { useState } from "react";
import PresetGallery from "./PresetGallery";

/**
 * "Starter Templates" showcase on the header/footer list page. Lets an admin
 * spin up any of the built-in presets without touching the blank-template flow.
 */
export default function StarterTemplates() {
  const [type, setType] = useState<"HEADER" | "FOOTER">("HEADER");

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        {(["HEADER", "FOOTER"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              type === t
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {t === "HEADER" ? "Headers" : "Footers"}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <PresetGallery type={type} />
      </div>
    </div>
  );
}

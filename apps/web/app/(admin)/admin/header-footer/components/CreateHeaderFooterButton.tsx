"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHeaderFooterAction } from "../actions";
import PresetGallery from "./PresetGallery";

export default function CreateHeaderFooterButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"HEADER" | "FOOTER">("HEADER");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const close = () => {
    setOpen(false);
    setName("");
    setError(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    const result = await createHeaderFooterAction(name.trim(), type);
    setLoading(false);
    if (result.ok && result.id) {
      close();
      router.push(`/admin/header-footer/${result.id}/edit`);
      return;
    }
    setError(result.ok ? "Failed to create template." : result.error);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        + New Template
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8">
          <div className="w-full max-w-4xl rounded-xl border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600">
                New Template
              </h2>
              <button
                onClick={close}
                className="text-sm text-zinc-500 hover:text-zinc-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Type tabs */}
            <div className="flex gap-2 px-5 pt-4">
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
                  {t === "HEADER" ? "🟦 Header" : "🟩 Footer"}
                </button>
              ))}
            </div>

            <div className="px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Start from a template
              </p>
              <PresetGallery type={type} compact />

              {/* Blank */}
              <div className="mt-5 border-t border-zinc-200 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Or start blank
                </p>
                {error && (
                  <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
                )}
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`${type === "HEADER" ? "Header" : "Footer"} name…`}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreate();
                      if (e.key === "Escape") close();
                    }}
                  />
                  <button
                    onClick={handleCreate}
                    disabled={loading || !name.trim()}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                  >
                    {loading ? "Creating…" : "Create blank"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

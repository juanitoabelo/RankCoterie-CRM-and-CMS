"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPageLayoutAction } from "../actions";

export default function CreatePageLayoutButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const result = await createPageLayoutAction(name.trim());
    setLoading(false);
    if (result.ok && result.id) {
      router.push(`/admin/page-layout/${result.id}/edit`);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        + New Template
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name..."
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCreate();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <button
        onClick={handleCreate}
        disabled={loading || !name.trim()}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        Cancel
      </button>
    </div>
  );
}

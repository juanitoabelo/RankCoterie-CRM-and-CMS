"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setDefaultBlogTemplateAction, deleteBlogTemplateAction } from "../actions";

export function SetDefaultForm({ id, isDefault }: { id: string; isDefault: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (isDefault) return null;

  const handleClick = async () => {
    setLoading(true);
    await setDefaultBlogTemplateAction(id);
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
    >
      {loading ? "..." : "Set as Default"}
    </button>
  );
}

export function DeleteForm({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!confirm("Delete this template?")) return;
    setLoading(true);
    await deleteBlogTemplateAction(id);
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "..." : "Delete"}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { deleteCompanyListingTemplate } from "../actions";

interface Props {
  id: string;
  name: string;
}

export default function DeleteTemplateButton({ id, name }: Props) {
  const [isPending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteCompanyListingTemplate(id);
      if (res.ok) {
        window.location.reload();
      } else {
        alert(res.error);
      }
    });
  };

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={isPending}
        className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-zinc-600">Delete &ldquo;{name}&rdquo;?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        disabled={isPending}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
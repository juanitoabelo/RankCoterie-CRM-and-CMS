"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateResult = { ok: true; id: string } | { ok: false; error: string };

export default function NewTemplateForm({ onCreate }: { onCreate: (formData: FormData) => Promise<CreateResult> }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await onCreate(formData);
    if (result.ok) {
      router.push(`/admin/listing-layouts/${result.id}/edit`);
    } else {
      setError(result.error);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
      <label className="block text-sm font-medium text-zinc-700">
        Template name
        <input
          required
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Downtown Clinic Layout"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-700">
        Description <span className="font-normal text-zinc-400">(optional)</span>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>
      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {busy ? "Creating…" : "Create & open builder"}
      </button>
    </form>
  );
}

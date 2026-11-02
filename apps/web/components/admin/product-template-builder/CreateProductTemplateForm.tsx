"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { createProductTemplateAction } from "@/app/(admin)/admin/product-templates/actions";

export default function CreateProductTemplateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await createProductTemplateAction(name);
    setSaving(false);
    if (!result.ok || !result.id) {
      setError(result.ok ? "The template could not be opened." : result.error);
      return;
    }
    router.push(`/admin/product-templates/${result.id}`);
  }

  return (
    <form onSubmit={submit} className="mt-5 max-w-xl rounded-lg border border-zinc-200 bg-white p-5">
      <label htmlFor="product-template-name" className="block text-sm font-medium text-zinc-800">
        Template name
      </label>
      <input
        id="product-template-name"
        required
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Default product page"
        className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create and design template"}
      </button>
    </form>
  );
}

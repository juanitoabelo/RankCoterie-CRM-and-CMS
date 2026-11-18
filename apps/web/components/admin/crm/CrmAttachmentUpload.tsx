"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CrmAttachmentUpload({
  dealId,
  leadId,
  clientId,
}: {
  dealId?: string;
  leadId?: string;
  clientId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/attachments", { method: "POST", body: data });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
      form.reset();
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2">
      {dealId && <input type="hidden" name="dealId" value={dealId} />}
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      {clientId && <input type="hidden" name="clientId" value={clientId} />}
      <input
        type="file"
        name="file"
        required
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,image/*"
        className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:text-white"
      />
      <button
        disabled={busy}
        className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload attachment"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}

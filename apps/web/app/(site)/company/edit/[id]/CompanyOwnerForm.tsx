"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCompanyListingContent } from "../../actions";

const fieldCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const labelCls = "block text-sm font-medium text-zinc-800";

export default function CompanyOwnerForm({
  listingId,
  initial,
}: {
  listingId: string;
  initial: {
    title: string;
    summary: string;
    description: string;
    phone: string;
    website: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setMessage(null);
    startTransition(async () => {
      try {
        await updateCompanyListingContent(listingId, fd);
        setMessage({ type: "ok", text: "Page updated." });
        router.refresh();
      } catch {
        // Server action redirects on success — only real failures land here.
        setMessage({ type: "error", text: "Could not save. Refresh and try again." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={
            message.type === "error"
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
          }
        >
          {message.text}
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Company details</h2>
        <div>
          <label className={labelCls}>Company name *</label>
          <input name="title" required defaultValue={initial.title} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Short summary</label>
          <input name="summary" defaultValue={initial.summary} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input name="phone" defaultValue={initial.phone} className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <input
            name="website"
            type="url"
            defaultValue={initial.website}
            className={fieldCls}
            placeholder="https://…"
          />
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Address</h2>
        <div>
          <label className={labelCls}>Street</label>
          <input name="address" defaultValue={initial.address} className={fieldCls} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelCls}>City</label>
            <input name="city" defaultValue={initial.city} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>State</label>
            <input name="state" defaultValue={initial.state} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>ZIP</label>
            <input name="zip" defaultValue={initial.zip} className={fieldCls} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Description</h2>
        <textarea
          name="description"
          rows={10}
          defaultValue={initial.description}
          className={`${fieldCls} min-h-[12rem] font-mono text-xs leading-5`}
          placeholder="Describe your company… (HTML allowed)"
        />
      </section>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

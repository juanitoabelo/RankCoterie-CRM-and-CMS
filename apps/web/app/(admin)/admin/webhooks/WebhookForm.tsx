"use client";

import { useState, useTransition } from "react";
import { createWebhookEndpoint, updateWebhookEndpoint, type ActionResult } from "./actions";

interface WebhookFormProps {
  endpoint: {
    id?: string;
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
    maxRetries: number;
    retryDelay: number;
  } | null;
  events: { value: string; label: string }[];
  submitLabel: string;
}

const EVENT_CATEGORIES = {
  Leads: ["lead.created", "lead.updated"],
  Orders: ["order.paid", "order.refunded"],
  Listings: ["listing.created", "listing.updated"],
  Payments: ["payment.failed"],
  Subscriptions: ["subscription.cancelled"],
} as const;

export default function WebhookForm({
  endpoint,
  events,
  submitLabel,
}: WebhookFormProps) {
  const [message, setMessage] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    endpoint?.events ?? [],
  );

  const action = endpoint?.id
    ? updateWebhookEndpoint.bind(null, endpoint.id)
    : createWebhookEndpoint;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    const formData = new FormData(e.currentTarget);
    // Add selected events
    selectedEvents.forEach((evt) => formData.append("events", evt));
    startTransition(async () => {
      const res = await action(formData);
      setMessage(res);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>
          {message.ok ? "Saved." : message.error}
        </p>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-zinc-900">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">Name *</label>
            <input name="name" required defaultValue={endpoint?.name ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="e.g. CRM Integration" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">URL *</label>
            <input name="url" type="url" required defaultValue={endpoint?.url ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" placeholder="https://your-app.com/webhook" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">Max Retries</label>
            <input name="maxRetries" type="number" min="0" defaultValue={endpoint?.maxRetries ?? 3} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">Retry Delay (seconds)</label>
            <input name="retryDelay" type="number" min="0" defaultValue={endpoint?.retryDelay ?? 60} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end pb-1 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={endpoint?.isActive ?? true}
                className="h-4 w-4 accent-zinc-900"
              />
              Active
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900">Events to Subscribe</h2>
        <p className="text-sm text-zinc-500">Select which events should trigger this webhook</p>
        <div className="space-y-4">
          {Object.entries(EVENT_CATEGORIES).map(([category, categoryEvents]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-zinc-700 mb-2 capitalize">{category}</h4>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {categoryEvents.map((event) => (
                  <label
                    key={event}
                    className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedEvents.includes(event)
                        ? "border-blue-500 bg-blue-50"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={event}
                      checked={selectedEvents.includes(event)}
                      onChange={() => setSelectedEvents((prev) =>
                        prev.includes(event)
                          ? prev.filter((e) => e !== event)
                          : [...prev, event]
                      )}
                      className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-mono text-zinc-700">{event}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
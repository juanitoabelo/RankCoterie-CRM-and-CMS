"use client";

import { useState, useTransition } from "react";
import {
  retryWebhookDeliveryAction,
  retryWebhookDeliveriesBulk,
} from "./actions";

export type DeliveryRow = {
  id: string;
  event: string;
  status: string;
  attempt: number;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: Date | string;
  deliveredAt: Date | string | null;
  nextRetryAt: Date | string | null;
  endpoint: { id: string; name: string; url: string } | null;
};

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function statusClass(status: string): string {
  if (status === "SUCCESS") return "bg-green-100 text-green-700";
  if (status === "GIVEN_UP") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

export default function DeliveriesTable({
  deliveries,
  showEndpoint = true,
}: {
  deliveries: DeliveryRow[];
  showEndpoint?: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const retryOne = (id: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await retryWebhookDeliveryAction(id);
      setMessage(result.ok ? "Delivery retried." : result.error);
      if (result.ok) setSelected((prev) => prev.filter((entry) => entry !== id));
    });
  };

  const retryMany = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await retryWebhookDeliveriesBulk(selected);
      setMessage(result.ok ? `Retried ${result.count ?? selected.length} deliveries.` : result.error);
      if (result.ok) setSelected([]);
    });
  };

  const retryable = deliveries.filter((delivery) => delivery.status !== "SUCCESS");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          {retryable.length} retryable {retryable.length === 1 ? "delivery" : "deliveries"}
        </p>
        <button
          type="button"
          onClick={retryMany}
          disabled={isPending || !selected.length}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          Retry selected {selected.length ? `(${selected.length})` : ""}
        </button>
      </div>
      {message && <p className="text-sm text-zinc-700">{message}</p>}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 font-medium text-zinc-500">
                <input
                  type="checkbox"
                  aria-label="Select all retryable deliveries"
                  checked={retryable.length > 0 && retryable.every((row) => selected.includes(row.id))}
                  disabled={!retryable.length}
                  onChange={(event) =>
                    setSelected(event.target.checked ? retryable.map((row) => row.id) : [])
                  }
                />
              </th>
              {showEndpoint && <th className="p-3 font-medium text-zinc-500">Endpoint</th>}
              <th className="p-3 font-medium text-zinc-500">Event</th>
              <th className="p-3 font-medium text-zinc-500">Status</th>
              <th className="p-3 font-medium text-zinc-500">Attempt</th>
              <th className="p-3 font-medium text-zinc-500">Response</th>
              <th className="p-3 font-medium text-zinc-500">Created</th>
              <th className="p-3 font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={showEndpoint ? 8 : 7} className="p-8 text-center text-zinc-500">
                  No webhook deliveries match these filters.
                </td>
              </tr>
            ) : (
              deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-zinc-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Select delivery ${delivery.id}`}
                      checked={selected.includes(delivery.id)}
                      disabled={delivery.status === "SUCCESS"}
                      onChange={(event) =>
                        setSelected((prev) =>
                          event.target.checked
                            ? [...prev, delivery.id]
                            : prev.filter((id) => id !== delivery.id),
                        )
                      }
                    />
                  </td>
                  {showEndpoint && (
                    <td className="p-3 text-zinc-700">
                      {delivery.endpoint ? (
                        <a href={`/admin/webhooks/${delivery.endpoint.id}`} className="text-blue-600 hover:underline">
                          {delivery.endpoint.name}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="p-3 font-mono text-xs text-zinc-700">{delivery.event}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(delivery.status)}`}>
                      {delivery.status}
                    </span>
                    {delivery.nextRetryAt && delivery.status === "PENDING" && (
                      <p className="mt-1 text-xs text-zinc-500">
                        Next retry {formatDate(delivery.nextRetryAt)}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-zinc-700">{delivery.attempt}</td>
                  <td className="p-3 text-zinc-600">
                    {delivery.responseStatus ?? "—"}
                    {delivery.responseBody && (
                      <p className="max-w-xs truncate text-xs text-zinc-400" title={delivery.responseBody}>
                        {delivery.responseBody}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-zinc-500">{formatDate(delivery.createdAt)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      disabled={isPending || delivery.status === "SUCCESS"}
                      onClick={() => retryOne(delivery.id)}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-40"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getWebhookDeliveries, getWebhookEndpoints, getWebhookEvents } from "../actions";
import DeliveriesTable, { type DeliveryRow } from "../DeliveriesTable";

export const revalidate = 0;

export const metadata = { title: "Webhook Deliveries | Admin" };

type DeliverySearchParams = {
  status?: string | string[];
  event?: string | string[];
  endpointId?: string | string[];
};

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function WebhookDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<DeliverySearchParams>;
}) {
  const query = await searchParams;
  const status = one(query.status);
  const event = one(query.event);
  const endpointId = one(query.endpointId);
  const [deliveries, endpoints, events] = await Promise.all([
    getWebhookDeliveries({ status, event, endpointId }),
    getWebhookEndpoints(),
    getWebhookEvents(),
  ]);

  const rows: DeliveryRow[] = deliveries.map((delivery) => ({
    id: delivery.id,
    event: delivery.event,
    status: delivery.status,
    attempt: delivery.attempt,
    responseStatus: delivery.responseStatus,
    responseBody: delivery.responseBody,
    createdAt: delivery.createdAt,
    deliveredAt: delivery.deliveredAt,
    nextRetryAt: delivery.nextRetryAt,
    endpoint: delivery.endpoint,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Webhook Deliveries</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Inspect failed deliveries and retry them individually or in bulk.
          </p>
        </div>
        <Link href="/admin/webhooks" className="text-sm text-blue-600 hover:underline">
          Manage endpoints
        </Link>
      </div>

      <form method="get" className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-4">
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block font-medium">Status</span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {["PENDING", "SUCCESS", "GIVEN_UP", "FAILED"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block font-medium">Event</span>
          <select
            name="event"
            defaultValue={event}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All events</option>
            {events.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-700">
          <span className="mb-1 block font-medium">Endpoint</span>
          <select
            name="endpointId"
            defaultValue={endpointId}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">All endpoints</option>
            {endpoints.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Apply filters
          </button>
          <Link href="/admin/webhooks/deliveries" className="px-2 py-2 text-sm text-zinc-600 hover:underline">
            Clear
          </Link>
        </div>
      </form>

      <DeliveriesTable deliveries={rows} />
    </div>
  );
}

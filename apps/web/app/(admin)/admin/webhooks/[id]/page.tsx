import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteWebhookEndpoint, getWebhookEndpoint, testWebhookEndpoint } from "../actions";
import DeliveriesTable, { type DeliveryRow } from "../DeliveriesTable";

export const revalidate = 0;

export const metadata = { title: "Webhook Endpoint | Admin" };

export default async function WebhookEndpointPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const endpoint = await getWebhookEndpoint(id);
  if (!endpoint) notFound();

  const rows: DeliveryRow[] = endpoint.deliveries.map((delivery) => ({
    id: delivery.id,
    event: delivery.event,
    status: delivery.status,
    attempt: delivery.attempt,
    responseStatus: delivery.responseStatus,
    responseBody: delivery.responseBody,
    createdAt: delivery.createdAt,
    deliveredAt: delivery.deliveredAt,
    nextRetryAt: delivery.nextRetryAt,
    endpoint: { id: endpoint.id, name: endpoint.name, url: endpoint.url },
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/webhooks" className="text-sm text-blue-600 hover:underline">
            ← All webhook endpoints
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{endpoint.name}</h1>
          <p className="mt-1 break-all text-sm text-zinc-500">{endpoint.url}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/webhooks/${endpoint.id}/edit`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Edit endpoint
          </Link>
          <form action={async () => { await testWebhookEndpoint(endpoint.id); }}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Send test delivery
            </button>
          </form>
          <form action={async () => { await deleteWebhookEndpoint(endpoint.id); }}>
            <button
              type="submit"
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Delete endpoint
            </button>
          </form>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Status</p>
          <p className="mt-1 font-medium text-zinc-900">
            {endpoint.isActive ? "Active" : "Inactive"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Successes</p>
          <p className="mt-1 font-medium text-zinc-900">{endpoint.successCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Failures</p>
          <p className="mt-1 font-medium text-zinc-900">{endpoint.failureCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Retry policy</p>
          <p className="mt-1 font-medium text-zinc-900">
            {endpoint.maxRetries} attempts · {endpoint.retryDelay}s delay
          </p>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Subscribed events</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {endpoint.events.map((event) => (
              <span key={event} className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-xs text-zinc-700">
                {event}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Recent deliveries</h2>
          <Link
            href={`/admin/webhooks/deliveries?endpointId=${endpoint.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            View all deliveries
          </Link>
        </div>
        <DeliveriesTable deliveries={rows} showEndpoint={false} />
      </section>
    </div>
  );
}

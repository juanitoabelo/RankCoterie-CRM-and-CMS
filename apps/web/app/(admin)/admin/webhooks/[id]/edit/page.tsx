import Link from "next/link";
import { notFound } from "next/navigation";
import { getWebhookEndpoint, getWebhookEvents } from "../../actions";
import WebhookForm from "../../WebhookForm";

export const revalidate = 0;

export const metadata = { title: "Edit Webhook Endpoint | Admin" };

export default async function EditWebhookEndpointPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [endpoint, events] = await Promise.all([getWebhookEndpoint(id), getWebhookEvents()]);
  if (!endpoint) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link href={`/admin/webhooks/${endpoint.id}`} className="text-sm text-blue-600 hover:underline">
          ← Back to endpoint
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Edit webhook endpoint</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update the destination, retry policy, and subscribed events for {endpoint.name}.
        </p>
      </div>
      <WebhookForm
        endpoint={{
          id: endpoint.id,
          name: endpoint.name,
          url: endpoint.url,
          events: endpoint.events,
          isActive: endpoint.isActive,
          maxRetries: endpoint.maxRetries,
          retryDelay: endpoint.retryDelay,
        }}
        events={events}
        submitLabel="Save changes"
      />
    </div>
  );
}

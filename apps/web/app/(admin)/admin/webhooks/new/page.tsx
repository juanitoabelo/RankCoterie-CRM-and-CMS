import { getWebhookEvents } from "../actions";
import WebhookForm from "../WebhookForm";

export const revalidate = 0;

export default async function NewWebhookPage() {
  const events = await getWebhookEvents();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Webhooks / <span className="text-zinc-700">New</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">New Webhook Endpoint</h1>
      <div className="mt-6 max-w-3xl">
        <WebhookForm
          endpoint={null}
          events={events}
          submitLabel="Create Endpoint"
        />
      </div>
    </div>
  );
}
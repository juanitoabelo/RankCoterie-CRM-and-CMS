import { prisma } from "@/lib/directory/prismaCatalog";
import { getWebhookEndpoints, getWebhookEvents } from "./actions";
import Link from "next/link";

export const revalidate = 0;

export const metadata = { title: "Webhooks | Admin" };

export default async function WebhooksPage() {
  const [endpoints, events] = await Promise.all([
    getWebhookEndpoints(),
    getWebhookEvents(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Webhook Endpoints</h1>
          <p className="text-zinc-500 mt-1">Manage webhook endpoints for event notifications</p>
        </div>
        <Link
          href="/admin/webhooks/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Create Endpoint
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="p-3 font-medium text-zinc-500">Name</th>
              <th className="p-3 font-medium text-zinc-500">URL</th>
              <th className="p-3 font-medium text-zinc-500">Events</th>
              <th className="p-3 font-medium text-zinc-500">Status</th>
              <th className="p-3 font-medium text-zinc-500">Deliveries</th>
              <th className="p-3 font-medium text-zinc-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {endpoints.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-500">
                  No webhook endpoints configured yet.
                  <Link href="/admin/webhooks/new" className="ml-2 text-blue-600 hover:underline">
                    Create your first endpoint
                  </Link>
                </td>
              </tr>
            ) : (
              endpoints.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-50">
                  <td className="p-3">
                    <p className="font-medium text-zinc-900">{e.name}</p>
                  </td>
                  <td className="p-3 text-zinc-600 truncate max-w-xs">{e.url}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {e.events.map((evt: string) => (
                        <span key={evt} className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                          {evt}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700"
                    }`}>
                      {e.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-600">{e._count.deliveries}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/webhooks/${e.id}`} className="text-sm text-blue-600 hover:underline">
                        View
                      </Link>
                      <Link href={`/admin/webhooks/${e.id}/edit`} className="text-sm text-zinc-600 hover:underline">
                        Edit
                      </Link>
                    </div>
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
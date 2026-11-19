import { requireSection } from "@/modules/auth";
import { getCrmApiKeys } from "@/modules/api/keys";
import { revokeCrmApiKeyAction } from "./actions";
import ApiKeyCreateForm from "./ApiKeyCreateForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "CRM API Keys | Admin" };

function formatDate(value: Date | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function CrmApiKeysPage() {
  await requireSection("crm");
  const keys = await getCrmApiKeys();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">CRM API keys</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Create scoped keys for integrations. Use <code className="text-xs">Authorization: Bearer &lt;token&gt;</code>{" "}
        with <code className="text-xs">/api/v1/crm/...</code>.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Create key</h2>
          <div className="mt-3">
            <ApiKeyCreateForm />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Existing keys</h2>
          {keys.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No API keys have been created.</p>
          ) : (
            <div className="mt-3 space-y-3 overflow-x-auto">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{key.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">{key.keyPrefix}…</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {key.scopes.join(", ")} · Last used {formatDate(key.lastUsedAt)}
                    </p>
                  </div>
                  {key.revokedAt ? (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                      Revoked
                    </span>
                  ) : (
                    <form action={revokeCrmApiKeyAction}>
                      <input type="hidden" name="id" value={key.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

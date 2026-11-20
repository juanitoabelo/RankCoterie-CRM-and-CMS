import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmSettings } from "@/modules/crm/settings";
import { getCrmProducts, getCrmStagesWithCounts } from "@/modules/crm/queries";
import {
  crmRecalculateScoresForm,
  crmSettingsForm,
  crmStageCreateForm,
  crmStageUpdateForm,
  crmProductCreateForm,
  crmProductDeleteForm,
} from "@/modules/crm/actions";
import { FlashBanner } from "@/components/admin/FlashBanner";
import Link from "next/link";
import { getCrmEmailConnections } from "@/modules/crm/oauth-sync";
import {
  OAUTH_PROVIDERS,
  oauthMissingEnv,
  oauthProviderConfigured,
  oauthProviderLabel,
} from "@/modules/crm/oauth-providers";
import { evaluateCrmHealthAlerts, getCrmHealth } from "@/modules/crm/health";
import { crmEmailDisconnectForm, crmEmailSyncForm } from "@/modules/crm/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Settings | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

export default async function CrmSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const { error, ok } = await searchParams;
  const [settings, stages, products, connections, health] = await Promise.all([
    getCrmSettings(),
    getCrmStagesWithCounts(access),
    getCrmProducts(),
    getCrmEmailConnections(access.isAdmin ? undefined : user.id),
    getCrmHealth(),
  ]);
  const operationsAlerts = evaluateCrmHealthAlerts(health, health.checkedAt);
  const oauthStatus = await Promise.all(
    OAUTH_PROVIDERS.map(async (provider) => {
      const configured = await oauthProviderConfigured(provider);
      return {
        provider,
        configured,
        missing: configured ? [] : await oauthMissingEnv(provider),
      };
    }),
  );

  return (
    <div>
      <FlashBanner error={error} ok={ok} />
      <h1 className="text-2xl font-semibold text-zinc-900">CRM settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Pipeline stages, stale-deal thresholds, lead assignment, and score maintenance.
      </p>
      {access.isAdmin && (
        <p className="mt-2 text-sm">
          <Link href="/admin/crm/settings/integrations" className="text-zinc-700 underline">
            Integration settings
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">General</h2>
          <form action={crmSettingsForm} className="mt-3 space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="autoAssignLeads"
                defaultChecked={settings.autoAssignLeads}
                className="mt-0.5 rounded border-zinc-300"
              />
              <span>
                <span className="font-medium text-zinc-800">Auto-assign new leads</span>
                <span className="block text-xs text-zinc-500">
                  Assign new leads to the active rep with the fewest open leads.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="restrictSalesRepsToOwned"
                defaultChecked={settings.restrictSalesRepsToOwned}
                className="mt-0.5 rounded border-zinc-300"
              />
              <span>
                <span className="font-medium text-zinc-800">Restrict reps to owned records</span>
                <span className="block text-xs text-zinc-500">
                  Sales reps only see deals, leads, and clients assigned to them. Admins always
                  see everything.
                </span>
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Stale deal threshold (days)</span>
              <input
                name="staleDealDays"
                type="number"
                min="1"
                max="365"
                defaultValue={settings.staleDealDays}
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-500">
                Open deals with no activity for this many days are highlighted on the pipeline.
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Default currency</span>
              <input
                name="defaultCurrency"
                maxLength={3}
                defaultValue={settings.defaultCurrency}
                className={inputCls}
              />
            </label>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
              Save settings
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Mailbox &amp; calendar sync
            </h2>
            <Link href="/admin/crm/audit" className="text-xs text-zinc-500 underline">
              Audit trail
            </Link>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Connect a Google or Microsoft mailbox to import emails and meetings for matching leads,
            clients, and deals. Tokens are encrypted at rest; the cron endpoint syncs every 15
            minutes.
          </p>
          <div className="mt-4 space-y-2">
            {oauthStatus.map(({ provider, configured, missing }) => {
              const existing = connections.find((connection) => connection.provider === provider);
              return (
                <div
                  key={provider}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-800">{oauthProviderLabel(provider)}</p>
                    {existing ? (
                      <p className="truncate text-xs text-zinc-500">
                        {existing.email} · last sync{" "}
                        {existing.lastSyncAt ? existing.lastSyncAt.toLocaleString() : "never"}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        {configured
                          ? "Not connected"
                          : `Missing: ${missing.join(", ")}`}
                      </p>
                    )}
                    {existing?.lastSyncError && (
                      <p className="mt-1 text-xs text-red-600">{existing.lastSyncError}</p>
                    )}
                  </div>
                  {existing ? (
                    <form action={crmEmailDisconnectForm}>
                      <input type="hidden" name="connectionId" value={existing.id} />
                      <input type="hidden" name="returnTo" value="/admin/crm/settings" />
                      <button className="text-xs text-red-600 hover:underline">Disconnect</button>
                    </form>
                  ) : configured ? (
                    <a
                      href={`/api/crm/oauth/${provider}/start`}
                      className="rounded-lg border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      Connect
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
          <form action={crmEmailSyncForm} className="mt-4">
            <input type="hidden" name="returnTo" value="/admin/crm/settings" />
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
              Sync connected mailboxes now
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Operations
          </h2>
          <div className="mt-3 space-y-2 text-sm text-zinc-600">
            <p>
              Status: <span className="font-medium">{health.status}</span> · storage:{" "}
              <span className="font-medium">{health.config.attachmentStorage}</span>
            </p>
            <p>
              Last activity import:{" "}
              {health.lastSyncAt ? health.lastSyncAt.toLocaleString() : "never"}
              <br />
              Last reminder run:{" "}
              {health.lastReminderAt ? health.lastReminderAt.toLocaleString() : "never"}
            </p>
            <p>
              <Link href="/api/crm/health" target="_blank" className="text-zinc-700 underline">
                Health endpoint (JSON)
              </Link>
            </p>
          </div>
          {operationsAlerts.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {operationsAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    alert.level === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <p className="font-medium">
                    {alert.level === "error" ? "Error" : "Warning"}: {alert.title}
                  </p>
                  <p className="mt-0.5 text-zinc-600">{alert.details}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-zinc-400">No operations alerts.</p>
          )}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Lead scoring</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Scores update when leads are created, edited, assigned, noted, or converted. Run a full
            recalculation after changing data outside the CRM.
          </p>
          <form action={crmRecalculateScoresForm} className="mt-4">
            <button className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
              Recalculate all lead scores
            </button>
          </form>
        </section>
      </div>

      {access.isAdmin && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Product catalog
            </h2>
            <span className="text-xs text-zinc-400">{products.length} product(s)</span>
          </div>
          <div className="mt-4 space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-800">
                    {product.name}
                    {product.sku ? <span className="ml-2 text-xs text-zinc-400">{product.sku}</span> : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {product.currency} {Number(product.unitPrice).toFixed(2)}
                    {product.description ? ` · ${product.description}` : ""}
                  </p>
                </div>
                <form action={crmProductDeleteForm}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button className="text-xs text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-zinc-400">No products yet.</p>
            )}
          </div>
          <form action={crmProductCreateForm} className="mt-4 grid gap-2 sm:grid-cols-12">
            <label className="block text-xs text-zinc-500 sm:col-span-4">
              Name
              <input name="name" required className={inputCls} />
            </label>
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              SKU
              <input name="sku" className={inputCls} />
            </label>
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Unit price
              <input name="unitPrice" type="number" min="0" step="0.01" defaultValue="0" className={inputCls} />
            </label>
            <label className="block text-xs text-zinc-500 sm:col-span-1">
              Currency
              <input name="currency" maxLength={3} defaultValue={settings.defaultCurrency} className={inputCls} />
            </label>
            <label className="block text-xs text-zinc-500 sm:col-span-3">
              Description
              <input name="description" className={inputCls} />
            </label>
            <div className="sm:col-span-12">
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
                Add product
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Pipeline stages
          </h2>
          <p className="text-xs text-zinc-400">
            Keys are stable. Rename labels and tune probabilities without losing deals.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {stages.map((stage) => (
            <form
              key={stage.id}
              action={crmStageUpdateForm}
              className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-12"
            >
              <input type="hidden" name="stageId" value={stage.id} />
              <label className="block text-xs text-zinc-500 sm:col-span-3">
                Label
                <input name="label" defaultValue={stage.label} className={inputCls} />
              </label>
              <label className="block text-xs text-zinc-500 sm:col-span-1">
                Order
                <input name="order" type="number" defaultValue={stage.order} className={inputCls} />
              </label>
              <label className="block text-xs text-zinc-500 sm:col-span-2">
                Probability %
                <input
                  name="probability"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={stage.probability}
                  className={inputCls}
                />
              </label>
              <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
                <input type="checkbox" name="isWon" defaultChecked={stage.isWon} className="rounded border-zinc-300" />
                Won
              </label>
              <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
                <input type="checkbox" name="isLost" defaultChecked={stage.isLost} className="rounded border-zinc-300" />
                Lost
              </label>
              <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
                <input type="checkbox" name="active" defaultChecked={stage.active} className="rounded border-zinc-300" />
                Active
              </label>
              <div className="flex items-end sm:col-span-3">
                <button className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50">
                  Save stage · {stage.dealCount} deal(s)
                </button>
              </div>
            </form>
          ))}
        </div>

        <form action={crmStageCreateForm} className="mt-5 grid gap-2 rounded-lg border border-dashed border-zinc-300 p-3 sm:grid-cols-12">
          <label className="block text-xs text-zinc-500 sm:col-span-4">
            New stage label
            <input name="label" required placeholder="e.g. Contract sent" className={inputCls} />
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Order
            <input name="order" type="number" placeholder="auto" className={inputCls} />
          </label>
          <label className="block text-xs text-zinc-500 sm:col-span-2">
            Probability %
            <input name="probability" type="number" min="0" max="100" defaultValue="0" className={inputCls} />
          </label>
          <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
            <input type="checkbox" name="isWon" className="rounded border-zinc-300" />
            Won
          </label>
          <label className="flex items-center gap-2 pt-5 text-xs text-zinc-600 sm:col-span-1">
            <input type="checkbox" name="isLost" className="rounded border-zinc-300" />
            Lost
          </label>
          <div className="flex items-end sm:col-span-2">
            <button className="w-full rounded-lg bg-zinc-900 px-3 py-1.5 text-xs text-white">
              Add stage
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

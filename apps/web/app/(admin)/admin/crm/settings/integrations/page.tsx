import Link from "next/link";
import { redirect } from "next/navigation";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { crmIntegrationSettingsForm } from "@/modules/crm/integration-settings-actions";
import {
  CRM_INTEGRATION_MANAGED_ENV_FIELDS,
  getCrmIntegrationSettingsView,
} from "@/modules/crm/integration-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Integrations | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

function sourceLabel(source: "saved" | "environment" | null, configured: boolean): string {
  if (source === "saved") return "Saved override";
  if (source === "environment") return "Environment variable";
  return configured ? "Configured" : "Not configured";
}

export default async function CrmIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  if (!access.isAdmin) {
    redirect("/admin/crm/settings?error=Only+CRM+admins+can+manage+integration+settings.");
  }
  const { error, ok } = await searchParams;
  const view = await getCrmIntegrationSettingsView();

  return (
    <div className="max-w-5xl">
      <FlashBanner error={error} ok={ok} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">CRM integration settings</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage OAuth apps, attachment storage, alerts, and webhook authentication from the CRM.
          </p>
        </div>
        <Link href="/admin/crm/settings" className="text-sm text-zinc-600 underline">
          Back to CRM settings
        </Link>
      </div>

      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Secrets are encrypted before they are stored. Leave a field blank to clear a saved override
        and fall back to its Vercel environment variable. Core database, session, and cron secrets
        stay in Vercel and are listed below.
      </div>

      <form action={crmIntegrationSettingsForm} className="mt-6 space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            OAuth applications
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Register <code className="text-xs">/api/crm/oauth/google/callback</code> and{" "}
            <code className="text-xs">/api/crm/oauth/microsoft/callback</code> with your provider.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-600">Google client ID</span>
              <input
                name="googleClientId"
                defaultValue={view.googleClientId.value ?? ""}
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(view.googleClientId.source, Boolean(view.googleClientId.value))}
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Google client secret</span>
              <input
                name="googleClientSecret"
                type="password"
                autoComplete="off"
                placeholder="Leave blank to keep or clear saved value"
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(view.googleClientSecret.source, view.googleClientSecret.configured)}
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Microsoft client ID</span>
              <input
                name="microsoftClientId"
                defaultValue={view.microsoftClientId.value ?? ""}
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(view.microsoftClientId.source, Boolean(view.microsoftClientId.value))}
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Microsoft client secret</span>
              <input
                name="microsoftClientSecret"
                type="password"
                autoComplete="off"
                placeholder="Leave blank to keep or clear saved value"
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(
                  view.microsoftClientSecret.source,
                  view.microsoftClientSecret.configured,
                )}
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Microsoft tenant ID</span>
              <input
                name="microsoftTenantId"
                defaultValue={view.microsoftTenantId.value ?? ""}
                placeholder="common"
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(
                  view.microsoftTenantId.source,
                  Boolean(view.microsoftTenantId.value),
                )}
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">OAuth redirect base URL</span>
              <input
                name="oauthRedirectBaseUrl"
                defaultValue={view.oauthRedirectBaseUrl.value ?? ""}
                placeholder="https://crm.example.com"
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(
                  view.oauthRedirectBaseUrl.source,
                  Boolean(view.oauthRedirectBaseUrl.value),
                )}
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Storage, alerts, and webhooks
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-600">Vercel Blob token</span>
              <input
                name="blobToken"
                type="password"
                autoComplete="off"
                placeholder="Leave blank to keep or clear saved value"
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(view.blobToken.source, view.blobToken.configured)}
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Alert webhook URL</span>
              <input
                name="alertWebhookUrl"
                type="password"
                autoComplete="off"
                placeholder="https://hooks.slack.com/services/..."
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(view.alertWebhookUrl.source, view.alertWebhookUrl.configured)}
              </span>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">Email events secret</span>
              <input
                name="emailEventsSecret"
                type="password"
                autoComplete="off"
                placeholder="Leave blank to keep or clear saved value"
                className={inputCls}
              />
              <span className="mt-1 block text-xs text-zinc-400">
                {sourceLabel(view.emailEventsSecret.source, view.emailEventsSecret.configured)} ·
                falls back to CRON_SECRET
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Managed in Vercel
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
            {CRM_INTEGRATION_MANAGED_ENV_FIELDS.map((field) => (
              <div key={field.label} className="rounded-lg border border-zinc-200 px-3 py-2">
                <p className="font-medium text-zinc-800">{field.label}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{field.names.join(", ")}</p>
              </div>
            ))}
          </div>
        </section>

        <div>
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">
            Save integration settings
          </button>
        </div>
      </form>
    </div>
  );
}

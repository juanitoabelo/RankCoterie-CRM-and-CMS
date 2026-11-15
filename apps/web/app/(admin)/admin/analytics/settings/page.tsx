import Link from "next/link";
import { requireSection } from "@/modules/auth";
import {
  getAnalyticsSecretStatus,
  getAnalyticsSettings,
  getTrackingHealth,
} from "@/modules/analytics";
import SyncButton from "../SyncButton";
import AnalyticsSettingsForm from "./AnalyticsSettingsForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Analytics Settings | Admin" };

function stamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : "never";
}

export default async function AdminAnalyticsSettingsPage() {
  await requireSection("analytics");
  const settings = await getAnalyticsSettings();
  const [health, secretStatus] = await Promise.all([
    getTrackingHealth(),
    getAnalyticsSecretStatus(),
  ]);

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Analytics settings</h1>
          <p className="mt-1 text-sm text-zinc-500">First-party tracking, Search Console, competitors, and retention.</p>
        </div>
        <Link href="/admin/analytics" className="text-sm text-zinc-600 hover:text-zinc-900 hover:underline">Back to overview</Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Last event</p>
          <p className="mt-1 text-sm text-zinc-700">{stamp(health.lastEventAt)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Events today</p>
          <p className="mt-1 text-sm text-zinc-700">{new Intl.NumberFormat().format(health.eventsToday)}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">GSC sync</p>
          <p className="mt-1 text-sm text-zinc-700">{health.gscConfigured ? stamp(health.gscLastSyncAt) : "not configured"}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Competitor sync</p>
          <p className="mt-1 text-sm text-zinc-700">{health.competitorConfigured ? stamp(health.competitorLastSyncAt) : "not configured"}</p>
        </div>
      </div>

      {(health.gscLastError || health.competitorLastError) && (
        <div className="mt-4 space-y-2">
          {health.gscLastError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Search Console: {health.gscLastError}</p>}
          {health.competitorLastError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Competitors: {health.competitorLastError}</p>}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <SyncButton kind="gsc" label="Sync Search Console" />
        <SyncButton kind="competitors" label="Sync competitors" />
      </div>

      <div className="mt-6">
        <AnalyticsSettingsForm settings={settings} secretStatus={secretStatus} />
      </div>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Environment fallbacks</h2>
        <p className="mt-3 text-xs text-zinc-500">
          Values saved above override these environment variables. Environment values are used only when the
          corresponding database setting is empty.
        </p>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          <li>GOOGLE_SERVICE_ACCOUNT_EMAIL</li>
          <li>GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</li>
          <li>DATAFORSEO_LOGIN</li>
          <li>DATAFORSEO_PASSWORD</li>
          <li>NEXT_PUBLIC_ANALYTICS_ENABLED=false (default before DB row)</li>
          <li>NEXT_PUBLIC_ANALYTICS_CONSENT_REQUIRED=true (default before DB row)</li>
        </ul>
      </section>
    </div>
  );
}

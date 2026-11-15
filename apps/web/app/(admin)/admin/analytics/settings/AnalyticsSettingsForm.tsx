"use client";

import { useActionState, useState } from "react";
import type {
  AnalyticsSecretStatus,
  AnalyticsSettingsData,
} from "@/modules/analytics/types";
import {
  saveAnalyticsSettingsAction,
  type AnalyticsSettingsState,
} from "../actions";

const initial: AnalyticsSettingsState = { ok: false };

function sourceHint(stored: string, env: boolean, fallback: string): string {
  if (stored) return "Stored in the database. Leave blank to clear and use the environment fallback.";
  if (env) return `Using ${fallback} from the environment. Enter a value to override it.`;
  return `No database value and ${fallback} is not set.`;
}

export default function AnalyticsSettingsForm({
  settings,
  secretStatus,
}: {
  settings: AnalyticsSettingsData;
  secretStatus: AnalyticsSecretStatus;
}) {
  const [state, action, pending] = useActionState(saveAnalyticsSettingsAction, initial);
  const [provider, setProvider] = useState(settings.competitorProvider);

  const labelCls = "block text-sm";
  const labelTextCls = "font-medium text-zinc-700";
  const inputCls =
    "mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm";
  const hintCls = "mt-1 block text-xs text-zinc-500";

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Tracking</h2>
        <div className="mt-4 grid gap-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={settings.enabled}
              className="mt-1"
            />
            <span>
              <span className={labelTextCls}>Analytics enabled</span>
              <span className={hintCls}>
                Kill switch. When disabled, the collector returns no content and the browser tracker stops sending
                events. The environment value is only used before this setting is first saved.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Search Console</h2>
        <div className="mt-4 grid gap-4">
          <label className={labelCls}>
            <span className={labelTextCls}>Search Console property</span>
            <input
              name="gscSiteUrl"
              defaultValue={settings.gscSiteUrl}
              placeholder="https://example.com/ or sc-domain:example.com"
              className={inputCls}
            />
            <span className={hintCls}>
              The service account must be added as a user on this Search Console property.
            </span>
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Service account email</span>
            <input
              name="googleServiceAccountEmail"
              defaultValue={secretStatus.googleServiceAccountEmail}
              placeholder="analytics@project.iam.gserviceaccount.com"
              className={inputCls}
            />
            <span className={hintCls}>
              {sourceHint(
                secretStatus.googleServiceAccountEmail,
                secretStatus.env.googleServiceAccountEmail,
                "GOOGLE_SERVICE_ACCOUNT_EMAIL",
              )}
            </span>
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Service account private key</span>
            <textarea
              name="googleServiceAccountPrivateKey"
              defaultValue=""
              rows={4}
              placeholder={
                secretStatus.hasGoogleServiceAccountPrivateKey
                  ? "Stored in the database — leave blank to keep the current key"
                  : secretStatus.env.googleServiceAccountPrivateKey
                    ? "Using GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — enter a value to override"
                    : "-----BEGIN PRIVATE KEY-----"
              }
              className={`${inputCls} font-mono text-xs`}
            />
            <span className={hintCls}>
              Leave blank to keep the stored key. Paste a new key to replace it. Stored values override
              GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.
            </span>
            {secretStatus.hasGoogleServiceAccountPrivateKey && (
              <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                <input type="checkbox" name="clearGoogleServiceAccountPrivateKey" />
                Clear the stored private key
              </label>
            )}
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>GA4 property ID (optional)</span>
            <input
              name="ga4PropertyId"
              defaultValue={settings.ga4PropertyId}
              placeholder="123456789"
              className={inputCls}
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Competitor tracking</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className={`${labelCls} md:col-span-2`}>
            <span className={labelTextCls}>Rank tracking provider</span>
            <select
              name="competitorProvider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as typeof provider)}
              className={inputCls}
            >
              <option value="manual">Manual watchlist (free)</option>
              <option value="searxng">Self-hosted SearXNG (free)</option>
              <option value="dataforseo">DataForSEO (paid)</option>
            </select>
            <span className={hintCls}>
              {provider === "manual"
                ? "No external API calls. Internal peers are always shown; domains and keywords become manual check links."
                : provider === "searxng"
                  ? "Queries your SearXNG instance's JSON API. Results are metasearch and may not match exact Google positions."
                  : "Uses DataForSEO's paid Google SERP API for organic positions."}
            </span>
          </label>
          {provider === "searxng" && (
            <label className={`${labelCls} md:col-span-2`}>
              <span className={labelTextCls}>SearXNG URL</span>
              <input
                name="searxngUrl"
                defaultValue={settings.searxngUrl}
                placeholder="https://searxng.example.com/"
                className={inputCls}
              />
              <span className={hintCls}>
                {sourceHint(settings.searxngUrl, secretStatus.env.searxngUrl, "SEARXNG_URL")} Enable JSON
                output in SearXNG&apos;s <code>settings.yml</code>.
              </span>
            </label>
          )}
          <label className={labelCls}>
            <span className={labelTextCls}>Competitor domains</span>
            <textarea
              name="competitorDomains"
              defaultValue={settings.competitorDomains.join("\n")}
              rows={6}
              placeholder={"competitor-one.com\ncompetitor-two.com"}
              className={`${inputCls} font-mono text-xs`}
            />
            <span className={hintCls}>
              Internal peers are discovered automatically. Add external competitors here for watchlist,
              SearXNG, or DataForSEO checks.
            </span>
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Target keywords</span>
            <textarea
              name="targetKeywords"
              defaultValue={settings.targetKeywords.join("\n")}
              rows={6}
              placeholder={"wilderness therapy\nfamily therapist near me"}
              className={`${inputCls} font-mono text-xs`}
            />
            <span className={hintCls}>
              Required for SearXNG and DataForSEO. Manual mode uses these to build check links. Up to 10 per
              sync.
            </span>
          </label>
          {provider === "dataforseo" && (
            <>
              <label className={labelCls}>
                <span className={labelTextCls}>DataForSEO login</span>
                <input
                  name="dataForSeoLogin"
                  defaultValue={secretStatus.dataForSeoLogin}
                  placeholder="you@example.com"
                  className={inputCls}
                />
                <span className={hintCls}>
                  {sourceHint(
                    secretStatus.dataForSeoLogin,
                    secretStatus.env.dataForSeoLogin,
                    "DATAFORSEO_LOGIN",
                  )}
                </span>
              </label>
              <label className={labelCls}>
                <span className={labelTextCls}>DataForSEO password</span>
                <input
                  type="password"
                  name="dataForSeoPassword"
                  defaultValue=""
                  placeholder={
                    secretStatus.hasDataForSeoPassword
                      ? "Stored in the database — leave blank to keep the current password"
                      : secretStatus.env.dataForSeoPassword
                        ? "Using DATAFORSEO_PASSWORD — enter a value to override"
                        : "DataForSEO API password"
                  }
                  className={inputCls}
                />
                <span className={hintCls}>
                  Leave blank to keep the stored password. Stored values override DATAFORSEO_PASSWORD.
                </span>
                {secretStatus.hasDataForSeoPassword && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                    <input type="checkbox" name="clearDataForSeoPassword" />
                    Clear the stored password
                  </label>
                )}
              </label>
            </>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Privacy & retention</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consentRequired"
              defaultChecked={settings.consentRequired}
              className="mt-1"
            />
            <span>
              <span className={labelTextCls}>Require analytics consent</span>
              <span className={hintCls}>
                Shows a consent banner and only tracks after acceptance. The environment value is only used before
                this setting is first saved.
              </span>
            </span>
          </label>
          <label className={labelCls}>
            <span className={labelTextCls}>Raw event retention (days)</span>
            <input
              type="number"
              name="retentionDays"
              min={7}
              max={3650}
              defaultValue={settings.retentionDays}
              className={inputCls}
            />
            <span className={hintCls}>Daily rollups are retained for 25 months.</span>
          </label>
          <label className={`${labelCls} md:col-span-2`}>
            <span className={labelTextCls}>Excluded paths</span>
            <textarea
              name="excludedPaths"
              defaultValue={settings.excludedPaths.join("\n")}
              rows={4}
              placeholder={"/admin\n/checkout\n/account"}
              className={`${inputCls} font-mono text-xs`}
            />
          </label>
        </div>
      </section>

      {state.error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && state.message && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

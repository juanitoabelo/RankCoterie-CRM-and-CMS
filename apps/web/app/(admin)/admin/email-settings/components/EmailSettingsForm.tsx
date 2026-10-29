"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailProviderKey, EmailStatus } from "../types";
import { EMAIL_PROVIDER_LABELS } from "../types";
import { saveEmailSettings, sendTestEmailAction } from "../actions";

const inputCls =
  "mt-1 block w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";
const labelCls = "block text-sm font-medium text-zinc-700";
const hintCls = "mt-1 text-xs text-zinc-400";

function ProviderFields({
  providerKey,
  settings,
  onPatch,
}: {
  providerKey: EmailProviderKey;
  settings: EmailStatus["settings"]["providers"][EmailProviderKey];
  onPatch: (patch: Partial<EmailStatus["settings"]["providers"][EmailProviderKey]>) => void;
}) {
  const isSmtp = providerKey === "smtp";
  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Priority</label>
          <input
            type="number"
            min={1}
            value={settings.priority}
            onChange={(e) => onPatch({ priority: Number(e.target.value) || 1 })}
            className={inputCls}
          />
          <p className={hintCls}>Lower number runs first when several providers are enabled.</p>
        </div>
        <div>
          <label className={labelCls}>From</label>
          <input
            type="text"
            placeholder={isSmtp ? "Billing <billing@example.com>" : "Rank Coterie <billing@example.com>"}
            value={settings.from}
            onChange={(e) => onPatch({ from: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {isSmtp ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>SMTP host</label>
            <input
              type="text"
              placeholder="smtp.gmail.com"
              value={settings.host}
              onChange={(e) => onPatch({ host: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Port</label>
            <input
              type="number"
              min={1}
              value={settings.port}
              onChange={(e) => onPatch({ port: Number(e.target.value) || 465 })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Username</label>
            <input
              type="text"
              autoComplete="off"
              value={settings.user}
              onChange={(e) => onPatch({ user: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Password (or app password)</label>
            <input
              type="password"
              autoComplete="new-password"
              value={settings.pass}
              onChange={(e) => onPatch({ pass: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={settings.secure}
                onChange={(e) => onPatch({ secure: e.target.checked })}
              />
              Use TLS (port 465) — uncheck for STARTTLS (port 587)
            </label>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <label className={labelCls}>API key</label>
          <input
            type="password"
            autoComplete="new-password"
            placeholder={providerKey === "resend" ? "re_..." : "xkeysib-..."}
            value={settings.apiKey}
            onChange={(e) => onPatch({ apiKey: e.target.value })}
            className={inputCls}
          />
        </div>
      )}
    </>
  );
}

function SetupNotes({ providerKey }: { providerKey: EmailProviderKey }) {
  const linkCls = "text-zinc-900 underline underline-offset-2 hover:text-zinc-600";
  if (providerKey === "resend") {
    return (
      <details className="mt-4 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">
          How to get a Resend API key
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            Create a free account at{" "}
            <a href="https://resend.com" target="_blank" rel="noreferrer" className={linkCls}>
              resend.com
            </a>{" "}
            (free tier: 3,000 emails/month).
          </li>
          <li>
            Verify your sending domain:{" "}
            <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className={linkCls}>
              Domains → Add Domain
            </a>{" "}
            and add the DNS records it shows you. (For a quick test you can skip this and use the
            default <code className="font-mono text-xs">onboarding@resend.dev</code> as From —
            it only delivers to your own Resend account email.)
          </li>
          <li>
            Create the key:{" "}
            <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className={linkCls}>
              API Keys → Create API Key
            </a>{" "}
            — copy the <code className="font-mono text-xs">re_…</code> key into the field above.
            Give it &quot;Full Access&quot; or at least sending permission.
          </li>
          <li>
            Set <strong>From</strong> to a sender on your verified domain, e.g.{" "}
            <code className="font-mono text-xs">Rank Coterie &lt;billing@yourdomain.com&gt;</code>.
          </li>
        </ol>
      </details>
    );
  }
  if (providerKey === "brevo") {
    return (
      <details className="mt-4 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        <summary className="cursor-pointer font-medium text-zinc-700">
          How to get a Brevo API key
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            Create a free account at{" "}
            <a href="https://www.brevo.com" target="_blank" rel="noreferrer" className={linkCls}>
              brevo.com
            </a>{" "}
            (free tier: 300 emails/day).
          </li>
          <li>
            Verify your sender:{" "}
            <a
              href="https://app.brevo.com/settings/senders"
              target="_blank"
              rel="noreferrer"
              className={linkCls}
            >
              Settings → Senders &amp; IP
            </a>{" "}
            — verify the email/domain you want to send From.
          </li>
          <li>
            Create the key:{" "}
            <a
              href="https://app.brevo.com/settings/keys/api"
              target="_blank"
              rel="noreferrer"
              className={linkCls}
            >
              Settings → SMTP &amp; API → API Keys
            </a>{" "}
            → Generate a new key (starts with{" "}
            <code className="font-mono text-xs">xkeysib-…</code>) and paste it above.
          </li>
          <li>
            Set <strong>From</strong> to a verified sender, e.g.{" "}
            <code className="font-mono text-xs">Rank Coterie &lt;billing@yourdomain.com&gt;</code>.
          </li>
        </ol>
      </details>
    );
  }
  return (
    <details className="mt-4 rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
      <summary className="cursor-pointer font-medium text-zinc-700">
        How to get SMTP credentials
      </summary>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          SMTP uses a mailbox you already have — no new signup. Username is usually the full email
          address; the password is your account password or an <strong>app password</strong>.
        </li>
        <li>
          <strong>Gmail / Google Workspace:</strong> enable 2-Step Verification, then create an app
          password at{" "}
          <a
            href="https://support.google.com/accounts/answer/185833"
            target="_blank"
            rel="noreferrer"
            className={linkCls}
          >
            Google Account → App passwords
          </a>
          . Host: <code className="font-mono text-xs">smtp.gmail.com</code>, port 587 (STARTTLS)
          or 465 (TLS).
        </li>
        <li>
          <strong>Microsoft 365 / Outlook:</strong> host{" "}
          <code className="font-mono text-xs">smtp.office365.com</code>, port 587, STARTTLS;
          username = your full address.
        </li>
        <li>
          <strong>Zoho / others:</strong> check your provider&apos;s SMTP settings page for
          host/port. Most shared hostings publish them in the control panel.
        </li>
      </ol>
      <p className="mt-2 text-xs text-zinc-500">
        SMTP has no daily quota — ideal as the last-resort provider in the chain.
      </p>
    </details>
  );
}

export default function EmailSettingsForm({ initial }: { initial: EmailStatus }) {
  const router = useRouter();
  const [form, setForm] = useState(initial.settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const now = initial.now;

  const patchProvider = (
    key: EmailProviderKey,
    patch: Partial<EmailStatus["settings"]["providers"][EmailProviderKey]>,
  ) => setForm((prev) => ({ ...prev, providers: { ...prev.providers, [key]: { ...prev.providers[key], ...patch } } }));

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("email_enabled", form.enabled ? "on" : "off");
    for (const key of ["resend", "brevo", "smtp"] as const) {
      const p = form.providers[key];
      fd.set(`${key}_enabled`, p.enabled ? "on" : "off");
      fd.set(`${key}_priority`, String(p.priority));
      fd.set(`${key}_apiKey`, p.apiKey);
      fd.set(`${key}_from`, p.from);
      fd.set(`${key}_host`, p.host);
      fd.set(`${key}_port`, String(p.port));
      fd.set(`${key}_secure`, p.secure ? "on" : "off");
      fd.set(`${key}_user`, p.user);
      fd.set(`${key}_pass`, p.pass);
    }
    const result = await saveEmailSettings(fd);
    setSaving(false);
    if (result.ok) {
      setMessage({ type: "ok", text: "Email settings saved." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error ?? "Save failed." });
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage(null);
    const result = await sendTestEmailAction(testTo);
    setTesting(false);
    if (result.ok) {
      setMessage({
        type: "ok",
        text: `Test email sent${result.provider ? ` via ${EMAIL_PROVIDER_LABELS[result.provider as EmailProviderKey] ?? result.provider}` : ""}.`,
      });
    } else {
      setMessage({ type: "error", text: result.error ?? "Test send failed." });
    }
  }

  const providerOrder = (["resend", "brevo", "smtp"] as const)
    .filter((k) => form.enabled && form.providers[k].enabled)
    .sort((a, b) => form.providers[a].priority - form.providers[b].priority);

  return (
    <div className="space-y-6">
      {initial.lastFailure && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">Last email delivery failed</p>
          <p className="mt-1">{initial.lastFailure.error}</p>
          <p className="mt-1 text-xs">
            {new Date(initial.lastFailure.at).toLocaleString()} — fix a provider below or enable
            another one (e.g. SMTP), then send a test email.
          </p>
        </div>
      )}

      {Object.entries(initial.cooldowns).map(([key, until]) =>
        until && new Date(until).getTime() > now ? (
          <div
            key={key}
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {EMAIL_PROVIDER_LABELS[key as EmailProviderKey]} hit its quota — paused until{" "}
            {new Date(until).toLocaleString()}. The next provider in the chain is being used until
            then.
          </div>
        ) : null,
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold text-zinc-900">Email sending</h2>
        <label className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
          />
          Enable email sending
        </label>
        <p className={hintCls}>
          Uncheck = &quot;No email for now&quot; — all transactional email (invoices, orders, claims)
          is skipped until you turn it back on.
        </p>
        {form.enabled && providerOrder.length > 1 && (
          <p className="mt-3 text-sm text-zinc-600">
            Delivery chain:{" "}
            <span className="font-medium">
              {providerOrder.map((k) => EMAIL_PROVIDER_LABELS[k]).join(" → ")}
            </span>
          </p>
        )}
      </div>

      {(["resend", "brevo", "smtp"] as const).map((key) => {
        const p = form.providers[key];
        const cooling =
          initial.cooldowns[key] && new Date(initial.cooldowns[key]!).getTime() > now;
        return (
          <div key={key} className="rounded-lg border border-zinc-200 bg-white p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {EMAIL_PROVIDER_LABELS[key]}
                </h2>
                {cooling && (
                  <p className="text-xs text-amber-700">Quota cooldown — skipped for now</p>
                )}
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => patchProvider(key, { enabled: e.target.checked })}
                />
                Enabled
              </label>
            </div>
            {p.enabled && <ProviderFields providerKey={key} settings={p} onPatch={(patch) => patchProvider(key, patch)} />}
            <SetupNotes providerKey={key} />
          </div>
        );
      })}

      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-base font-semibold text-zinc-900">Test the chain</h2>
        <p className={hintCls}>Sends through the enabled providers in priority order.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls}>Send test email to</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className={inputCls}
            />
          </div>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !testTo}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {testing ? "Sending…" : "Send test email"}
          </button>
        </div>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={
            message.type === "error"
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
          }
        >
          {message.text}
        </div>
      )}

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save email settings"}
        </button>
      </div>
    </div>
  );
}

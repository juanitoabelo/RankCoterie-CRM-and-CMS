"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AI_PROVIDERS, AI_PROVIDER_IDS, type AiProviderId } from "@/modules/ai/providers";
import type { AiProviderSettingsInput, AiProviderSettingsView } from "@/modules/ai/settings";
import { saveAiProviderSettingsAction } from "../actions";

type ProviderForm = {
  apiKey: string;
  clearKey: boolean;
  model: string;
  enabled: boolean;
};

type FormState = {
  primaryProvider: AiProviderId;
  fallbackEnabled: boolean;
  providers: Record<AiProviderId, ProviderForm>;
};

function initialState(settings: AiProviderSettingsView): FormState {
  const providers = {} as Record<AiProviderId, ProviderForm>;
  for (const provider of AI_PROVIDER_IDS) {
    providers[provider] = {
      apiKey: "",
      clearKey: false,
      model: settings.providers[provider].model,
      enabled: settings.providers[provider].enabled,
    };
  }
  return {
    primaryProvider: settings.primaryProvider,
    fallbackEnabled: settings.fallbackEnabled,
    providers,
  };
}

export default function AiSettingsForm({ settings }: { settings: AiProviderSettingsView }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialState(settings));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  function setProvider(provider: AiProviderId, patch: Partial<ProviderForm>) {
    setForm((previous) => ({
      ...previous,
      providers: {
        ...previous.providers,
        [provider]: { ...previous.providers[provider], ...patch },
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const providers: AiProviderSettingsInput["providers"] = {};
    for (const provider of AI_PROVIDER_IDS) {
      const current = form.providers[provider];
      providers[provider] = {
        enabled: current.enabled,
        model: current.model,
        clearKey: current.clearKey,
        ...(current.apiKey.trim() ? { apiKey: current.apiKey.trim() } : {}),
      };
    }

    const result = await saveAiProviderSettingsAction({
      primaryProvider: form.primaryProvider,
      fallbackEnabled: form.fallbackEnabled,
      providers,
    });

    setSaving(false);
    if (result.ok) {
      setMessage({ type: "ok", text: "AI provider settings saved." });
      setForm((previous) => ({
        ...previous,
        providers: AI_PROVIDER_IDS.reduce(
          (acc, provider) => {
            acc[provider] = { ...previous.providers[provider], apiKey: "", clearKey: false };
            return acc;
          },
          {} as Record<AiProviderId, ProviderForm>,
        ),
      }));
      router.refresh();
    } else {
      setMessage({ type: "error", text: result.error });
    }
  }

  const inputCls =
    "mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

  return (
    <div className="space-y-6">
      {!settings.encryptionConfigured && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Set <code>AI_TOKEN_ENCRYPTION_KEY</code> or <code>SESSION_SECRET</code> in the server environment before saving API keys.
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {message.text}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
        <div>
          <label htmlFor="primary-provider" className="block text-sm font-medium text-zinc-800">
            Primary provider
          </label>
          <select
            id="primary-provider"
            value={form.primaryProvider}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                primaryProvider: event.target.value as AiProviderId,
              }))
            }
            className={inputCls}
          >
            {AI_PROVIDER_IDS.map((provider) => (
              <option key={provider} value={provider}>
                {AI_PROVIDERS[provider].label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={form.fallbackEnabled}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, fallbackEnabled: event.target.checked }))
            }
            className="mt-1"
          />
          <span>
            Try other configured providers if the primary provider fails.
            <span className="block text-xs text-zinc-500">
              The deterministic &quot;Generate from parent content&quot; button remains available at no cost.
            </span>
          </span>
        </label>
      </div>

      {AI_PROVIDER_IDS.map((provider) => {
        const view = settings.providers[provider];
        const current = form.providers[provider];
        return (
          <div key={provider} className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-zinc-900">{AI_PROVIDERS[provider].label}</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  view.configured ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {view.configured ? `Configured (${view.source ?? "unknown"})` : "Not configured"}
              </span>
            </div>

            <p className="text-xs text-zinc-500">{AI_PROVIDERS[provider].freeTierNote}</p>

            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={current.enabled}
                onChange={(event) => setProvider(provider, { enabled: event.target.checked })}
              />
              Enabled
            </label>

            <div>
              <label className="block text-sm font-medium text-zinc-800">
                API key
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  Leave blank to keep the saved key.
                </span>
              </label>
              <input
                type="password"
                value={current.apiKey}
                onChange={(event) => setProvider(provider, { apiKey: event.target.value })}
                placeholder={view.configured ? "Saved key is in place" : "Paste API key"}
                autoComplete="off"
                className={inputCls}
              />
            </div>

            {view.configured && (
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={current.clearKey}
                  disabled={Boolean(current.apiKey.trim())}
                  onChange={(event) => setProvider(provider, { clearKey: event.target.checked })}
                />
                Clear saved key
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-800">Model</label>
              <input
                value={current.model}
                onChange={(event) => setProvider(provider, { model: event.target.value })}
                placeholder={AI_PROVIDERS[provider].defaultModel}
                className={inputCls}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {saving ? "Saving..." : "Save AI provider settings"}
        </button>
      </div>
    </div>
  );
}

import { getAiProviderSettings } from "./actions";
import AiSettingsForm from "./components/AiSettingsForm";

export const revalidate = 0;

export default async function AiSettingsPage() {
  const settings = await getAiProviderSettings();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">AI Providers</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">AI Provider Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Store provider API keys here instead of environment files. Keys are encrypted at rest and never shown again after saving.
      </p>

      <div className="mt-8 max-w-4xl">
        <AiSettingsForm settings={settings} />
      </div>
    </div>
  );
}

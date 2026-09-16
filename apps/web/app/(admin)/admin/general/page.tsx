import { getGeneralSettings } from "./actions";
import GeneralSettingsForm from "./components/GeneralSettingsForm";

export const revalidate = 0;

export default async function GeneralSettingsPage() {
  const settings = await getGeneralSettings();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">General</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">General Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        These settings control the overall site identity, localization, date and
        time formatting, and user registration behavior.
      </p>

      <div className="mt-8 max-w-3xl">
        <GeneralSettingsForm settings={settings} />
      </div>
    </div>
  );
}

import { getThemeSettings } from "./actions";
import ThemeSettingsAccordion from "./components/ThemeSettingsAccordion";

export const revalidate = 0;

export default async function ThemeSettingsPage() {
  const settings = await getThemeSettings();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Theme Settings</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Frontend Theme Settings
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Configure the global look and feel for your site. Choose a preset theme
        or customize colors, fonts, layout, and responsive behavior. These
        settings apply site-wide and can be overridden per block in the page
        builder.
      </p>

      <div className="mt-8 max-w-3xl">
        <ThemeSettingsAccordion settings={settings} />
      </div>
    </div>
  );
}

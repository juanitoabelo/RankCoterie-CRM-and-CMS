import { getReadingPages, getReadingSettings } from "./actions";
import ReadingSettingsForm from "./components/ReadingSettingsForm";

export const revalidate = 0;

export default async function ReadingSettingsPage() {
  const [pages, settings] = await Promise.all([
    getReadingPages(),
    getReadingSettings(),
  ]);

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Reading</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Reading Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Control what visitors see on the front page and how your content is
        syndicated. Choose between a dynamic listing of your latest articles or
        assign a static page as the homepage.
      </p>

      <div className="mt-8 max-w-3xl">
        <ReadingSettingsForm pages={pages} settings={settings} />
      </div>
    </div>
  );
}

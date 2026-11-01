import { getCustomCssJsSettings } from "@/modules/custom-css-js/actions";
import CustomCssJsForm from "./components/CustomCssJsForm";

export const revalidate = 0;

export default async function CustomCssJsPage() {
  const settings = await getCustomCssJsSettings();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Custom CSS & JS</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Custom CSS & JS</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Inject custom CSS into the site head and custom JavaScript before the closing body tag.
        These settings apply globally across the entire site.
      </p>

      <div className="mt-8 max-w-2xl">
        <CustomCssJsForm settings={settings} />
      </div>
    </div>
  );
}
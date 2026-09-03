import { getStyleGuide, saveStyleGuideForm } from "./actions";
import { FONT_STACKS } from "@/lib/style-guide";

export const revalidate = 0;

const COLORS: { key: "background" | "text" | "accent" | "headingColor" | "linkColor" | "linkHoverColor" | "buttonBg" | "buttonText"; label: string }[] = [
  { key: "background", label: "Background color" },
  { key: "text", label: "Body text color" },
  { key: "accent", label: "Accent / brand color" },
  { key: "headingColor", label: "Heading color" },
  { key: "linkColor", label: "Link color" },
  { key: "linkHoverColor", label: "Link hover color" },
  { key: "buttonBg", label: "Button background" },
  { key: "buttonText", label: "Button text" },
];

export default async function StyleGuideAdminPage() {
  const guide = await getStyleGuide();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Style Guide</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Global Style Guide</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Configure the site-wide look and feel — colors and fonts for headings,
        body text, buttons and links. These values apply globally and can be
        overridden per block in the page builder.
      </p>

      <form
        action={saveStyleGuideForm}
        className="mt-8 max-w-2xl space-y-6 rounded-xl border border-zinc-200 bg-white p-5"
      >
        <section>
          <h2 className="text-sm font-medium text-zinc-900">Colors</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {COLORS.map((c) => (
              <label key={c.key} className="block text-xs font-medium text-zinc-600">
                {c.label}
                <input
                  type="color"
                  name={c.key}
                  defaultValue={guide[c.key]}
                  className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-900">Font families</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Heading font (h1–h6)
              <select
                name="fontsHeading"
                defaultValue={guide.fonts.heading}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {FONT_STACKS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Body / description font
              <select
                name="fontsBody"
                defaultValue={guide.fonts.body}
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {FONT_STACKS.map((f) => (
                  <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="flex items-center justify-end border-t border-zinc-100 pt-4">
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Save style guide
          </button>
        </div>
      </form>
    </div>
  );
}

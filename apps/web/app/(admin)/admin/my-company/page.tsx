import { getCompany, saveCompanyForm } from "./actions";

export const revalidate = 0;

export default async function MyCompanyAdminPage() {
  const company = await getCompany();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Admin</span> /{" "}
        <span className="text-zinc-700">My Company</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">My Company</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Company profile and installed tracking / verification tags.
      </p>

      <form action={saveCompanyForm} className="mt-8 max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <label className="block text-xs font-medium text-zinc-600">
          Company name
          <input
            name="name"
            required
            defaultValue={company?.name ?? ""}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>

        <section>
          <h2 className="text-sm font-medium text-zinc-900">Tracking & verification</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              GA4 ID (e.g. G-XXXXXXX)
              <input name="ga4" defaultValue={company?.ga4 ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              GTM Container ID (e.g. GTM-XXXXXXX)
              <input name="gtm" defaultValue={company?.gtm ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Facebook / Meta Pixel ID
              <input name="fbPixel" defaultValue={company?.fbPixel ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Google Search Console site
              <input name="searchConsole" defaultValue={company?.searchConsole ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-medium text-zinc-600 sm:col-span-2">
              GSC verification tag (meta content value)
              <input name="gscVerificationTag" defaultValue={company?.gscVerificationTag ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono" />
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-900">Branding</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-600">
              Brand color
              <input type="color" name="brandColor" defaultValue={company?.brandColor ?? "#18181b"} className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1" />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Logo asset ID
              <input name="logoAssetId" defaultValue={company?.logoAssetId ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </label>
          </div>
        </section>

        <div className="flex justify-end border-t border-zinc-100 pt-4">
          <button type="submit" className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700">
            Save company
          </button>
        </div>
      </form>
    </div>
  );
}

import { applyListingForm } from "./actions";
import { isStripeConfigured } from "@/lib/billing/checkout";

export default function ApplyPage() {
  const configured = isStripeConfigured();

  const tierCard =
    "rounded-xl border border-zinc-200 bg-white p-5 text-left transition hover:border-zinc-300";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold text-zinc-900">Apply to get listed</h1>
      <p className="mt-3 text-zinc-600">
        Get your program listed in the directory with a local SEO page per region.
        Pay a one-time setup fee plus a monthly subscription after review.
      </p>

      {!configured && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Applications are temporarily paused while payments are being configured.
        </p>
      )}

      <form action={applyListingForm} className="mt-8 space-y-8">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Choose your tier</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className={`${tierCard} cursor-pointer`}>
              <input type="radio" name="tier" value="STANDARD" required className="sr-only" />
              <p className="font-semibold text-zinc-900">Standard — $97/mo</p>
              <p className="mt-1 text-sm text-zinc-600">
                Listed in category and region pages for your areas.
              </p>
            </label>
            <label className={`${tierCard} cursor-pointer`}>
              <input type="radio" name="tier" value="PREMIUM" required className="sr-only" />
              <p className="font-semibold text-zinc-900">Premium — $197/mo</p>
              <p className="mt-1 text-sm text-zinc-600">
                Featured placement at the top plus a dedicated landing page.
              </p>
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-800">Program title *</label>
            <input
              name="title"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              placeholder="e.g. Clearview Horizon"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Company name</label>
            <input
              name="companyName"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Contact email *</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Phone</label>
            <input name="phone" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800">Website</label>
            <input name="website" type="url" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-800">City</label>
              <input name="city" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800">State</label>
              <input name="state" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!configured}
          className="rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue to payment
        </button>
      </form>
    </div>
  );
}
import Link from "next/link";
import { getListingPaymentSettings } from "./actions";
import ListingPaymentSettingsForm from "./components/ListingPaymentSettingsForm";

export const revalidate = 0;

export default async function ListingPaymentSettingsPage() {
  const settings = await getListingPaymentSettings();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Directory /{" "}
        <Link href="/admin/listings" className="text-zinc-700 hover:underline">
          Listings
        </Link>{" "}
        / <span className="text-zinc-700">Payment Configuration</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Listing Payment Configuration</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Configure Stripe credentials and price IDs for paid directory listings. Leave a field blank to fall back to the matching environment variable.
      </p>

      <div className="mt-8 max-w-3xl">
        <ListingPaymentSettingsForm settings={settings} />
      </div>
    </div>
  );
}

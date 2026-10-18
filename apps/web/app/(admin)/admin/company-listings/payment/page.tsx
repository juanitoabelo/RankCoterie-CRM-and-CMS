import Link from "next/link";
import { getCompanyListingPaymentSettings } from "./actions";
import CompanyListingPaymentSettingsForm from "./components/CompanyListingPaymentSettingsForm";

export const revalidate = 0;

export default async function CompanyListingPaymentSettingsPage() {
  const settings = await getCompanyListingPaymentSettings();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin /{" "}
        <Link href="/admin/company-listings" className="text-zinc-700 hover:underline">
          Ads / Listing
        </Link>{" "}
        / <span className="text-zinc-700">Payment Configuration</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Company Listing Payment Configuration
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Payment settings exclusively for company landing pages — the one-time page setup fee and
        the recurring tier subscription. Blank fields inherit the directory configuration, then the
        environment.
      </p>

      <div className="mt-8 max-w-3xl">
        <CompanyListingPaymentSettingsForm settings={settings} />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { loadCompanyFormData } from "../data";
import CompanyListingForm from "../components/CompanyListingForm";

export const metadata: Metadata = { title: "Add New Company Page" };

export default async function NewCompanyListingPage() {
  await requireSection("listings");
  const data = await loadCompanyFormData();
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Admin / Directory /{" "}
        <Link href="/admin/company-listings" className="text-zinc-700 hover:underline">
          Company Listings
        </Link>{" "}
        / <span className="text-zinc-700">New</span>
      </p>
      <div className="max-w-3xl">
        <CompanyListingForm listing={null} {...data} />
      </div>
    </div>
  );
}

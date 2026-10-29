import { getCompanyApplyFormOptions } from "./actions";
import ApplyCompanyForm from "@/components/apply/ApplyCompanyForm";
import type { Metadata } from "next";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Get your company page | Rank Coterie",
  description:
    "A dedicated landing page for your business — one-time setup fee plus a monthly tier subscription.",
  robots: { index: false, follow: false },
};

export default async function ApplyCompanyPage() {
  const options = await getCompanyApplyFormOptions();
  return (
    <div className="mx-auto max-w-2xl">
      <ApplyCompanyForm initialOptions={options} />
    </div>
  );
}

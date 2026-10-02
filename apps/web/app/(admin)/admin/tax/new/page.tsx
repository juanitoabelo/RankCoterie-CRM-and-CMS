import Link from "next/link";
import TaxRateForm from "@/components/admin/tax/TaxRateForm";

export const revalidate = 0;

export default function NewTaxRatePage() {
  return (
    <div className="px-6 py-6">
      <div className="mb-4">
        <Link href="/admin/tax" className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline">
          ← Back to tax rates
        </Link>
      </div>
      <div className="max-w-xl">
        <TaxRateForm />
      </div>
    </div>
  );
}

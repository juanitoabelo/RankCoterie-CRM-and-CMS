import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import TaxRateForm from "@/components/admin/tax/TaxRateForm";

export const revalidate = 0;

export default async function EditTaxRatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rate = await prisma.taxRate.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!rate) notFound();

  return (
    <div className="px-6 py-6">
      <div className="mb-4">
        <Link href="/admin/tax" className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline">
          ← Back to tax rates
        </Link>
      </div>
      <div className="max-w-xl">
        <TaxRateForm
          initial={{
            id: rate.id,
            name: rate.name,
            country: rate.country,
            state: rate.state,
            rate: rate.rate,
            priority: rate.priority,
          }}
        />
      </div>
    </div>
  );
}

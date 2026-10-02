import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import CouponForm from "@/components/admin/coupon/CouponForm";

export const revalidate = 0;

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const coupon = await prisma.coupon.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!coupon) notFound();

  return (
    <div className="px-6 py-6">
      <div className="mb-4">
        <Link href="/admin/coupons" className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline">
          ← Back to coupons
        </Link>
      </div>
      <div className="max-w-xl">
        <CouponForm
          initial={{
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            amount: coupon.amount,
            description: coupon.description,
            minAmount: coupon.minAmount,
            maxAmount: coupon.maxAmount,
            usageLimit: coupon.usageLimit,
            startDate: coupon.startDate,
            endDate: coupon.endDate,
            isActive: coupon.isActive,
          }}
        />
      </div>
    </div>
  );
}

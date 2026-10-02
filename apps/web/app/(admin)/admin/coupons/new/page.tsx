import Link from "next/link";
import CouponForm from "@/components/admin/coupon/CouponForm";

export const revalidate = 0;

export default function NewCouponPage() {
  return (
    <div className="px-6 py-6">
      <div className="mb-4">
        <Link href="/admin/coupons" className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline">
          ← Back to coupons
        </Link>
      </div>
      <div className="max-w-xl">
        <CouponForm />
      </div>
    </div>
  );
}

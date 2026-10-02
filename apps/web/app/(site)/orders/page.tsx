import type { Metadata } from "next";
import OrderLookup from "@/components/storefront/OrderLookup";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Track your order",
  description: "Look up the status of your order with your order number and email.",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Track your order</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter your email to see all your orders, or add an order number for one specific
          order.
        </p>
      </div>
      <div className="mt-8">
        <OrderLookup initialOrderNumber={order ?? ""} />
      </div>
    </div>
  );
}

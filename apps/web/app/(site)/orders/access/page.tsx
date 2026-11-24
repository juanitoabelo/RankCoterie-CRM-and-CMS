import OrderAccessLookup from "@/components/storefront/OrderAccessLookup";

export default async function OrderAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; access?: string }>;
}) {
  const { orderId, access } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900">View a guest order</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Use the order ID and access code from your confirmation email. No account is required.
      </p>
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <OrderAccessLookup
          initialOrderId={orderId ?? ""}
          initialAccess={access ?? ""}
        />
      </div>
    </div>
  );
}

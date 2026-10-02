/**
 * Edit payment gateway — loads gateway by id and renders the edit form.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentGatewayById } from "@/modules/ecommerce/queries";
import GatewayEditForm from "@/components/admin/product/GatewayEditForm";

export const revalidate = 0;

export default async function EditPaymentGatewayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gateway = await getPaymentGatewayById(id);
  if (!gateway) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500">
          Admin /{" "}
          <Link href="/admin/products" className="text-zinc-700 hover:underline">
            Products
          </Link>{" "}
          /{" "}
          <Link href="/admin/products/payment-gateway" className="text-zinc-700 hover:underline">
            Payment Gateway
          </Link>{" "}
          / <span className="text-zinc-700">{gateway.name}</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit Payment Gateway</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Update credentials, switch between sandbox and live keys, or disable the gateway.
        </p>
      </div>

      <GatewayEditForm
        id={gateway.id}
        gateway={{
          name: gateway.name,
          type: gateway.type,
          isEnabled: gateway.isEnabled,
          isTestMode: gateway.isTestMode,
          config: gateway.config,
        }}
      />
    </div>
  );
}

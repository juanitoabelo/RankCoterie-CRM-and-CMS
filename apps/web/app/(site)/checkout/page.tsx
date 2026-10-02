import Link from "next/link";
import { redirect } from "next/navigation";
import { getCartBySession, getEnabledPaymentGateways } from "@/modules/ecommerce/queries";
import { readExistingCartSession } from "@/lib/cart-session";
import { quoteTotals, round2, type QuoteLine } from "@/lib/billing/totals";
import CheckoutForm from "@/components/storefront/CheckoutForm";

export const revalidate = 0;

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const sessionId = await readExistingCartSession();
  const cart = sessionId ? await getCartBySession(sessionId) : null;
  const items = cart?.items ?? [];

  if (items.length === 0) redirect("/cart");

  const gateways = await getEnabledPaymentGateways();

  const lines: QuoteLine[] = items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.quantity > 0 ? round2(item.lineTotal / item.quantity) : item.lineTotal,
    saleItem: item.product.salePrice !== null,
    shippingRequired: item.product.shippingRequired !== false,
  }));
  const initialTotals = await quoteTotals({
    lines,
    couponCode: cart?.couponCode ?? null,
  });

  const summary = items.map((item) => ({
    id: item.id,
    name: item.product.name,
    slug: item.product.slug,
    imageAssetId: item.product.images[0]?.assetId ?? null,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">Checkout</h1>
        <Link href="/cart" className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline">
          ← Back to cart
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Your order
          </h2>
          <ul className="mt-3 divide-y divide-zinc-100">
            {summary.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                {item.imageAssetId ? (
                  <img
                    src={`/api/assets/${item.imageAssetId}`}
                    alt=""
                    className="h-10 w-10 rounded border border-zinc-200 bg-zinc-50 object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded border border-dashed border-zinc-300 bg-zinc-50" />
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/${item.slug}`} className="block truncate text-sm font-medium text-zinc-900 hover:underline">
                    {item.name}
                  </Link>
                  <p className="text-xs text-zinc-500">Qty {item.quantity}</p>
                </div>
                <span className="text-sm font-medium text-zinc-900 tabular-nums">
                  ${item.lineTotal.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          {gateways.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
              Payments are not available yet — no payment gateway is enabled for this store.
            </div>
          ) : (
            <CheckoutForm
              gateways={gateways.map((gw) => ({ id: gw.id, name: gw.name, type: gw.type }))}
              initialTotals={initialTotals}
              couponCode={cart?.couponCode ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

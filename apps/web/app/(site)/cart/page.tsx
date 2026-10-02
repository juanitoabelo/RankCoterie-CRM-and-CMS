import Link from "next/link";
import { getCartBySession } from "@/modules/ecommerce/queries";
import { readExistingCartSession } from "@/lib/cart-session";
import { quoteTotals, round2, type QuoteLine } from "@/lib/billing/totals";
import CartView from "@/components/storefront/CartView";

export const revalidate = 0;

export const metadata = { title: "Your Cart" };

export default async function CartPage() {
  const sessionId = await readExistingCartSession();
  const cart = sessionId ? await getCartBySession(sessionId) : null;

  const items = (cart?.items ?? []).map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.product.name,
    slug: item.product.slug,
    imageAssetId: item.product.images[0]?.assetId ?? null,
    price: item.price,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
    stockStatus: item.product.stockStatus,
    manageStock: item.product.manageStock,
    stockQuantity: item.product.stockQuantity,
    backorders: item.product.backorders,
    lowStockAmount: item.product.lowStockAmount,
  }));

  const lines: QuoteLine[] = (cart?.items ?? []).map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.quantity > 0 ? round2(item.lineTotal / item.quantity) : item.lineTotal,
    saleItem: item.product.salePrice !== null,
    shippingRequired: item.product.shippingRequired !== false,
  }));
  const totals = await quoteTotals({
    lines,
    couponCode: cart?.couponCode ?? null,
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Your cart is empty</h1>
        <p className="mt-3 text-zinc-600">
          Browse the shop and add products to your cart to see them here.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900">Your cart</h1>
      <CartView
        items={items}
        initialTotals={totals}
        couponCode={cart?.couponCode ?? null}
        couponError={totals.couponError}
      />
    </div>
  );
}

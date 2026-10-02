import type { Metadata } from "next";
import WishlistClient from "@/components/storefront/WishlistClient";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Products you saved for later.",
};

export default function WishlistPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Wishlist</h1>
      <p className="mt-1 text-sm text-zinc-500">Products saved on this device.</p>
      <div className="mt-6">
        <WishlistClient />
      </div>
    </div>
  );
}

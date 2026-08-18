import Link from "next/link";
import { prisma } from "@/lib/directory/prismaCatalog";

export const revalidate = 0;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string }>;
}) {
  const { listingId } = await searchParams;
  const listing = listingId
    ? await prisma.listing.findUnique({ where: { id: listingId } })
    : null;

  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Application received</h1>
      <p className="mt-3 text-zinc-600">
        {listing
          ? `Payment confirmed for “${listing.title}”. Our team will review your listing and publish it once approved.`
          : "Payment confirmed. Our team will review your listing and publish it once approved."}
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Back to directory
      </Link>
    </div>
  );
}
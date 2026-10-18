import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/modules/shared";
import { requireUser } from "@/modules/auth";
import CompanyOwnerForm from "./CompanyOwnerForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit Page | Company Portal" };
export const revalidate = 0;

export default async function CompanyOwnerEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;

  const listing = await prisma.listing.findFirst({
    where: { id, isLandingPage: true, claimedById: user.id },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      description: true,
      phone: true,
      website: true,
      address: true,
      city: true,
      state: true,
      zip: true,
    },
  });
  if (!listing) redirect("/company?error=" + encodeURIComponent("Page not found."));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-sm text-zinc-500">
        <Link href="/company" className="text-zinc-700 hover:underline">
          Company Portal
        </Link>{" "}
        / <span className="text-zinc-700">Edit page</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit: {listing.title}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Changes appear on your live page immediately. Design, tier, and billing are
        managed by the directory team.
      </p>
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6">
        <CompanyOwnerForm
          listingId={listing.id}
          initial={{
            title: listing.title,
            summary: listing.summary ?? "",
            description: listing.description ?? "",
            phone: listing.phone ?? "",
            website: listing.website ?? "",
            address: listing.address ?? "",
            city: listing.city ?? "",
            state: listing.state ?? "",
            zip: listing.zip ?? "",
          }}
        />
      </div>
    </div>
  );
}

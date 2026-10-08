import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: { title: true, companyName: true },
  });

  if (!listing) return { title: "Claim Listing" };

  return {
    title: `Claim "${listing.title}" | Canopy Directory`,
    description: `Claim ownership of ${listing.title} to manage your listing profile.`,
  };
}

export default async function ClaimListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      companyName: true,
      email: true,
      phone: true,
      claimedById: true,
      claimedAt: true,
      verificationToken: true,
      verificationExpires: true,
      verifiedAt: true,
    },
  });

  if (!listing) notFound();

  if (listing.claimedById) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-4">Already Claimed</h1>
        <p className="text-zinc-600 mb-6">This listing has already been claimed by another user.</p>
        <Link href={`/listing/${slug}`} className="text-blue-600 hover:underline">
          View Listing →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Claim Your Business</h1>
        <p className="text-zinc-600 mb-6">
          Verify your ownership of <strong>{listing.title}</strong> to manage your profile,
          respond to reviews, access analytics, and more.
        </p>

        <form id="claim-form" className="space-y-6" action="/api/claim" method="POST">
          <input type="hidden" name="listingId" value={listing.id} />
          <input type="hidden" name="slug" value={slug} />

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Your Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="owner@business.com"
            />
            <p className="mt-1 text-xs text-zinc-500">
              We'll send a verification link to this email address.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Your Name</label>
            <input
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Phone (optional)</label>
            <input
              name="phone"
              type="tel"
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Your Role</label>
            <select
              name="role"
              className="w-full rounded-lg border border-zinc-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="marketing">Marketing</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
            <h4 className="font-medium text-amber-800 mb-1">Verification Process</h4>
            <ul className="mt-2 text-sm text-amber-700 space-y-1">
              <li>• We'll send a verification link to the email above</li>
              <li>• Click the link within 24 hours to confirm ownership</li>
              <li>• If the email matches the listing's contact info, verification is instant</li>
              <li>• Otherwise, we may request additional documentation</li>
            </ul>
          </div>

          <button type="submit" className="w-full rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 transition-colors">
            Send Verification Email
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="font-semibold text-zinc-900 mb-3">Benefits of Claiming</h3>
        <ul className="space-y-2 text-sm text-zinc-600">
          <li className="flex items-center gap-2"><span className="h-5 w-5 rounded bg-green-100 flex items-center justify-center text-green-600">✓</span> Edit your business profile & contact info</li>
          <li className="flex items-center gap-2"><span className="h-5 w-5 rounded bg-green-100 flex items-center justify-center text-green-600">✓</span> Respond to customer reviews</li>
          <li className="flex items-center gap-2"><span className="h-5 w-5 rounded bg-green-100 flex items-center justify-center text-green-600">✓</span> View analytics: views, clicks, leads</li>
          <li className="flex items-center gap-2"><span className="h-5 w-5 rounded bg-green-100 flex items-center justify-center text-green-600">✓</span> Upgrade to Premium for featured placement</li>
          <li className="flex items-center gap-2"><span className="h-5 w-5 rounded bg-green-100 flex items-center justify-center text-green-600">✓</span> Receive lead notifications instantly</li>
        </ul>
      </div>

      <div className="mt-6 text-center">
        <Link href={`/listing/${slug}`} className="text-blue-600 hover:underline">
          ← Back to Listing
        </Link>
      </div>
    </div>
  );
}
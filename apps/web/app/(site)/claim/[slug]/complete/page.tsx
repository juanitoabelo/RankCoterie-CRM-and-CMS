import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/modules/shared";
import { completeClaim } from "@/modules/listings/actions";

export const revalidate = 0;

async function completeClaimAction(formData: FormData): Promise<void> {
  "use server";
  await completeClaim(formData);
}

export default async function ClaimCompletePage({
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
      verifiedAt: true,
      claimedById: true,
    },
  });

  if (!listing) notFound();
  if (listing.claimedById) redirect(`/listing/${slug}?claimed=already`);
  if (!listing.verifiedAt) redirect(`/claim/${slug}?error=not_verified`);

  const fieldCls =
    "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
  const labelCls = "block text-sm font-medium text-zinc-800";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-xl border border-zinc-200 bg-white p-8">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
          You&apos;re verified — create your login
        </h1>
        <p className="text-zinc-600 mb-6">
          Your ownership of <strong>{listing.companyName || listing.title}</strong>{" "}
          has been verified. Set a password below and we&apos;ll link this listing to
          your account so you can manage it.
        </p>

        <form action={completeClaimAction} className="space-y-5">
          <input type="hidden" name="listingId" value={listing.id} />

          <div>
            <label className={labelCls}>Email</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={listing.email ?? ""}
              className={fieldCls}
            />
          </div>

          <div>
            <label className={labelCls}>Your name</label>
            <input
              name="name"
              type="text"
              required
              className={fieldCls}
              placeholder="John Smith"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Password</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls}>Confirm password</label>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={fieldCls}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-6 py-3 text-base font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Create login and claim listing
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already registered?{" "}
        <Link href="/admin/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
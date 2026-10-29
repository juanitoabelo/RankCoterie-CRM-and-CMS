import Link from "next/link";
import LoginCard from "@/components/auth/LoginCard";
import { listingLogin } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Listing Login | Rank Coterie" };

export default async function ListingLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <LoginCard
      title="Listing Login"
      subtitle="Sign in to manage your directory listing."
      action={listingLogin}
      serverError={error ?? null}
      help={
        <>
          Own a company page?{" "}
          <Link href="/company/login" className="font-medium text-zinc-700 underline">
            Company login
          </Link>
          <br />
          Not listed yet?{" "}
          <Link href="/apply" className="font-medium text-zinc-700 underline">
            Apply to get listed
          </Link>
        </>
      }
    />
  );
}

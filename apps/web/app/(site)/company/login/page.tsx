import Link from "next/link";
import LoginCard from "@/components/auth/LoginCard";
import { companyLogin } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Company Login | Canopy" };

export default async function CompanyLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <LoginCard
      title="Company Login"
      subtitle="Manage your company page and invoices."
      action={companyLogin}
      serverError={error ?? null}
      help={
        <>
          Directory owner?{" "}
          <Link href="/listing/login" className="font-medium text-zinc-700 underline">
            Listing login
          </Link>
          <br />
          Want a company page?{" "}
          <Link href="/apply/company" className="font-medium text-zinc-700 underline">
            Apply here
          </Link>
        </>
      }
    />
  );
}

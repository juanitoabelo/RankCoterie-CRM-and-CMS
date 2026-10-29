/**
 * Public invoice pay page — unauthenticated. Shown to clients from the
 * payment-link email or after Stripe redirects back (?status=done).
 * The hosted Stripe Payment Link does the actual card capture; this page
 * only presents the invoice and the link.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Invoice payment",
  robots: { index: false },
};

const STATUS_BADGE: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700",
  ATTEMPTED: "bg-amber-100 text-amber-700",
  DECLINED: "bg-red-100 text-red-700",
  ERROR: "bg-zinc-100 text-zinc-600",
  REFUNDED: "bg-sky-100 text-sky-700",
  CHARGEDBACK: "bg-purple-100 text-purple-700",
};

export default async function PayInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { invoiceId } = await params;
  const { status } = await searchParams;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, merchant: true },
  });
  if (!invoice) notFound();

  const amount = `$${invoice.amount.toFixed(2)}`;
  const clientName = [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" ");
  const paid = invoice.status === "APPROVED";
  const badge = STATUS_BADGE[invoice.status] ?? "bg-zinc-100 text-zinc-500";
  const canPay = !paid && Boolean(invoice.payUrl);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Invoice</p>
            <p className="mt-1 text-sm text-zinc-500">
              {invoice.id.slice(-8)}
              {invoice.chargeDate ? ` · due ${invoice.chargeDate.toISOString().slice(0, 10)}` : ""}
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge}`}>{invoice.status}</span>
        </div>

        <p className="mt-6 text-sm text-zinc-600">
          {clientName ? `${clientName} — ` : ""}amount due
        </p>
        <p className="mt-1 text-4xl font-semibold text-zinc-900">{amount}</p>

        {status === "done" && !paid && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            Thanks! Your payment is being confirmed — this page will update shortly.
          </div>
        )}
        {status === "done" && paid && (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            Payment received — thank you!
          </div>
        )}

        {paid ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            This invoice has been paid
            {invoice.paidAt ? ` on ${invoice.paidAt.toISOString().slice(0, 10)}` : ""}. Keep the reference{" "}
            <span className="font-mono">{invoice.id}</span>.
          </div>
        ) : canPay ? (
          <a
            href={invoice.payUrl as string}
            className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Pay {amount} securely
          </a>
        ) : (
          <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            A payment link isn&apos;t available for this invoice right now — please contact us and
            reference invoice <span className="font-mono">{invoice.id}</span>.
          </div>
        )}

        <div className="mt-8 border-t border-zinc-100 pt-4 text-xs text-zinc-400">
          {invoice.merchant ? <p>Billed by: {invoice.merchant.name}</p> : null}
          <p className="mt-1">
            Secure card payment processed by our payment provider.
          </p>
          <p className="mt-2">
            <Link href="/" className="text-zinc-500 hover:underline">Rank Coterie</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

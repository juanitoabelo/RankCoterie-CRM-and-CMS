"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  sendCompanyListingInvoice,
  markCompanyListingInvoicePaid,
  resendCompanyListingInvoice,
} from "../actions";

type BillingInvoice = {
  id: string;
  amount: { toString(): string };
  status: string;
  isRecurring: boolean;
  interval: string | null;
  payUrl: string | null;
  emailSentAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  responseMsg: string | null;
  client: { email: string | null; firstName: string | null; lastName: string | null } | null;
};

const inputCls =
  "block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";
const labelCls = "block text-sm font-medium text-zinc-700";

function statusChip(status: string) {
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-100 text-emerald-800",
    ATTEMPTED: "bg-amber-100 text-amber-800",
    DECLINED: "bg-red-100 text-red-800",
    ERROR: "bg-red-100 text-red-800",
    REFUNDED: "bg-zinc-100 text-zinc-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        map[status] ?? "bg-zinc-100 text-zinc-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function CompanyListingBillingCard({
  listingId,
  tier,
  defaultSetupAmount,
  defaultEmail,
  defaultTierAmount,
  invoices,
}: {
  listingId: string;
  tier: string;
  defaultSetupAmount: string;
  defaultEmail: string;
  defaultTierAmount: string;
  invoices: BillingInvoice[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [setupAmount, setSetupAmount] = useState(defaultSetupAmount);
  const [clientEmail, setClientEmail] = useState(defaultEmail);
  const [tierRecurring, setTierRecurring] = useState(true);
  const [tierAmount, setTierAmount] = useState(
    tier === "PREMIUM" ? defaultTierAmount : defaultTierAmount,
  );
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  function sendInvoice() {
    setMessage(null);
    const fd = new FormData();
    fd.set("setupAmount", setupAmount);
    fd.set("clientEmail", clientEmail);
    if (tierRecurring) {
      fd.set("tierRecurring", "on");
      fd.set("tierAmount", tierAmount);
    }
    startTransition(async () => {
      const result = await sendCompanyListingInvoice(listingId, fd);
      if (result.ok) {
        setMessage({ type: "ok", text: result.message ?? "Invoice sent." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Could not send invoice." });
      }
    });
  }

  function markPaid(invoiceId: string) {
    setMessage(null);
    setActionId(invoiceId);
    startTransition(async () => {
      const result = await markCompanyListingInvoicePaid(listingId, invoiceId);
      setActionId(null);
      setMessage(
        result.ok
          ? { type: "ok", text: result.message ?? "Marked paid." }
          : { type: "error", text: result.error ?? "Could not mark paid." },
      );
      router.refresh();
    });
  }

  function resend(invoiceId: string) {
    setMessage(null);
    setActionId(invoiceId);
    startTransition(async () => {
      const result = await resendCompanyListingInvoice(listingId, invoiceId);
      setActionId(null);
      setMessage(
        result.ok
          ? { type: "ok", text: result.message ?? "Invoice emailed." }
          : { type: "error", text: result.error ?? "Could not send email." },
      );
    });
  }

  const live = invoices.some((i) => i.status === "APPROVED");

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-zinc-900">Billing</h3>
        {live ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Paid — page is LIVE
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Awaiting first payment
          </span>
        )}
      </div>

      {/* Send invoice */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-800">Send payment invoice</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Setup fee amount ($)</label>
            <input
              className={inputCls}
              value={setupAmount}
              onChange={(e) => setSetupAmount(e.target.value)}
              placeholder="e.g. 497"
            />
          </div>
          <div>
            <label className={labelCls}>Client email</label>
            <input
              className={inputCls}
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="owner@company.com"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={tierRecurring}
            onChange={(e) => setTierRecurring(e.target.checked)}
            className="h-4 w-4 accent-zinc-900"
          />
          Also create recurring {tier.toLowerCase()} tier invoice ($/mo)
        </label>
        {tierRecurring && (
          <div className="max-w-xs">
            <label className={labelCls}>Tier amount ($/mo)</label>
            <input
              className={inputCls}
              value={tierAmount}
              onChange={(e) => setTierAmount(e.target.value)}
            />
          </div>
        )}
        <button
          onClick={sendInvoice}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send Invoice"}
        </button>
        <p className="text-xs text-zinc-500">
          Paying the setup invoice marks this page LIVE automatically.{" "}
          <Link
            href="/admin/company-listings/payment"
            className="text-zinc-600 underline hover:text-zinc-900"
          >
            Payment settings
          </Link>
        </p>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={
            message.type === "error"
              ? "rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700"
              : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700"
          }
        >
          {message.text}
        </div>
      )}

      {/* Invoice list */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-800">Invoices</p>
        {invoices.length === 0 && (
          <p className="text-sm text-zinc-400">No invoices yet for this page.</p>
        )}
        {invoices.map((inv) => (
          <div
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">
                  ${inv.amount.toString()}
                </span>
                {statusChip(inv.status)}
                {inv.isRecurring && (
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {inv.interval ?? "recurring"}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {inv.responseMsg ?? "Invoice"} · {inv.client?.email ?? "no email"}
                {inv.emailSentAt ? " · emailed" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {inv.payUrl && inv.status !== "APPROVED" && (
                <a
                  href={inv.payUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  ↗ Pay link
                </a>
              )}
              {inv.status !== "APPROVED" && (
                <>
                  <button
                    onClick={() => resend(inv.id)}
                    disabled={pending && actionId === inv.id}
                    className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Resend
                  </button>
                  <button
                    onClick={() => markPaid(inv.id)}
                    disabled={pending && actionId === inv.id}
                    className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Mark paid
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

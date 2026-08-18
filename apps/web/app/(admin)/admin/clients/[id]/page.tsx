import Link from "next/link";
import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/directory/prismaCatalog";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Client | Admin" };

const statusBadge: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  ATTEMPTED: "bg-amber-50 text-amber-700",
  DECLINED: "bg-red-50 text-red-700",
  ERROR: "bg-zinc-100 text-zinc-600",
  REFUNDED: "bg-sky-50 text-sky-700",
  CHARGEDBACK: "bg-purple-50 text-purple-700",
};

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { invoices: { orderBy: { createdAt: "desc" } } },
  });
  if (!client) notFound();

  const totalBilled = client.invoices
    .filter((i) => i.status === "APPROVED")
    .reduce((sum, i) => sum.add(i.amount), new Prisma.Decimal(0));
  const phones = (client.phones ?? []) as { number?: string; kind?: string }[];

  return (
    <div>
      <Link href="/admin/clients" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to clients
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        {client.firstName} {client.lastName}
        <span className="ml-3 align-middle font-mono text-sm font-normal text-zinc-400">
          ****{client.maskedCard ?? "—"}
        </span>
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {client.email ?? "no email"} · created {client.createdAt.toISOString().slice(0, 10)} ·
        total billed ${totalBilled.toFixed(2)} ·{" "}
        {client.leadId ? (
          <Link href={`/admin/leads/${client.leadId}`} className="text-zinc-700 underline">
            from lead
          </Link>
        ) : (
          "no linked lead"
        )}
      </p>
      {phones.length > 0 && (
        <p className="mt-1 text-sm text-zinc-500">
          {phones.map((p) => `${p.number} (${p.kind ?? "?"})`).join(", ")}
        </p>
      )}

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Invoices ({client.invoices.length})
      </h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-400">
          <tr>
            <th className="py-2 pr-4">Amount</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Charged</th>
            <th className="py-2 pr-4">Recurring</th>
            <th className="py-2 pr-4">Retries</th>
            <th className="py-2 pr-4">Stripe ID</th>
            <th className="py-2 pr-4">Response</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {client.invoices.map((inv) => (
            <tr key={inv.id} className="hover:bg-zinc-50">
              <td className="py-3 pr-4 font-medium text-zinc-900">${inv.amount.toFixed(2)}</td>
              <td className="py-3 pr-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[inv.status] ?? "bg-zinc-100 text-zinc-500"}`}>
                  {inv.status}
                </span>
              </td>
              <td className="py-3 pr-4 text-zinc-600">
                {inv.chargeDate ? inv.chargeDate.toISOString().slice(0, 10) : "—"}
              </td>
              <td className="py-3 pr-4 text-zinc-600">
                {inv.isRecurring ? `${inv.interval ?? "?"} recurring` : "one-time"}
              </td>
              <td className="py-3 pr-4 text-zinc-600">{inv.retries}</td>
              <td className="py-3 pr-4 font-mono text-xs text-zinc-500">{inv.stripePaymentId ?? "—"}</td>
              <td className="py-3 pr-4 text-xs text-zinc-500">{inv.responseMsg ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

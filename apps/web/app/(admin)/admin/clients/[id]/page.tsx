import Link from "next/link";
import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";
import {
  clientEditForm,
  clientNoteForm,
  clientNoteDeleteForm,
  clientPartialForm,
  clientDeleteForm,
} from "../actions";

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

const CARD_TYPE_TO_CODE: Record<string, string> = {
  Visa: "VISA",
  Mastercard: "MASTERCARD",
  Discover: "DISCOVER",
  Amex: "AMEX",
};

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

export default async function AdminClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("clients");
  const { id } = await params;
  const { error, ok } = await searchParams;
  const [client, users] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        invoices: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 500,
    }),
  ]);
  if (!client) notFound();

  const noteUserIds = [...new Set(client.notes.map((n) => n.userId).filter(Boolean))] as string[];
  const noteUsers = noteUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: noteUserIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const userName = (u: { firstName: string | null; lastName: string | null; email: string } | null) =>
    u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null;
  const noteUserById = new Map(noteUsers.map((u) => [u.id, userName(u)]));

  const totalBilled = client.invoices
    .filter((i) => i.status === "APPROVED")
    .reduce((sum, i) => sum.add(i.amount), new Prisma.Decimal(0));
  const phones = (Array.isArray(client.phones) ? client.phones : []) as {
    number?: string;
    kind?: string;
  }[];
  const addresses = (Array.isArray(client.addresses) ? client.addresses : []) as {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    kind?: string;
  }[];
  const phoneOf = (kind: string) => phones.find((p) => p.kind === kind)?.number ?? "";
  const billing = addresses.find((a) => a.kind === "billing") ?? {};

  // Parse maskedCard "Visa •••• 4242" → cardType=VISA, last4=4242 (unknown labels stay blank)
  const mcMatch = (client.maskedCard ?? "").match(/^(.*?)\s*•+\s*(\d{4})$/);
  const cardTypeCode = mcMatch ? (CARD_TYPE_TO_CODE[mcMatch[1].trim()] ?? "") : "";
  const cardLast4 = mcMatch ? mcMatch[2] : "";

  const assignedUser = client.assignedToId
    ? users.find((u) => u.id === client.assignedToId)
    : null;
  const clientName = `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || client.email || "client";
  const invoiceListHref = `/admin/invoices?client=${encodeURIComponent(clientName)}`;

  return (
    <div>
      <Link href="/admin/clients" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to clients
      </Link>
      <FlashBanner error={error} ok={ok} />
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
        {client.firstName} {client.lastName}
        {client.maskedCard && (
          <span className="ml-3 align-middle font-mono text-sm font-normal text-zinc-400">
            {client.maskedCard}
          </span>
        )}
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
        {client.isPartial && (
          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            partial
          </span>
        )}
      </p>
      <p className="mt-1 text-sm text-zinc-500">
        {phones.length > 0
          ? phones.map((p) => `${p.number} (${p.kind ?? "?"})`).join(", ")
          : "no phones"}
        {" · "}
        {assignedUser
          ? `rep: ${assignedUser.firstName ?? ""} ${assignedUser.lastName ?? ""}`.trim()
          : "no assigned rep"}
        {" · "}
        {billing.state
          ? `billing: ${[billing.line1, billing.city, billing.state, billing.zip].filter(Boolean).join(", ")}`
          : "no billing address"}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={invoiceListHref}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          View in invoices
        </Link>
        <form action={clientPartialForm}>
          <input type="hidden" name="clientId" value={client.id} />
          <button className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50">
            {client.isPartial ? "Clear partial flag" : "Mark as partial"}
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Edit client</h2>
          <form action={clientEditForm} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="clientId" value={client.id} />
            <label className="block text-sm">
              <span className="text-zinc-600">First name</span>
              <input type="text" name="firstName" defaultValue={client.firstName ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Last name</span>
              <input type="text" name="lastName" defaultValue={client.lastName ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Email</span>
              <input type="email" name="email" defaultValue={client.email ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Campaign ID</span>
              <input type="text" name="campaignId" defaultValue={client.campaignId ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Home phone</span>
              <input type="tel" name="phoneHome" defaultValue={phoneOf("home")} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Work phone</span>
              <input type="tel" name="phoneWork" defaultValue={phoneOf("work")} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Cell phone</span>
              <input type="tel" name="phoneCell" defaultValue={phoneOf("cell")} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Assigned representative</span>
              <select name="assignedToId" defaultValue={client.assignedToId ?? ""} className={selectCls}>
                <option value="">— none —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">Billing address</span>
              <input type="text" name="billAddress1" defaultValue={billing.line1 ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Billing city</span>
              <input type="text" name="billCity" defaultValue={billing.city ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Billing state</span>
              <input type="text" name="billState" defaultValue={billing.state ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Billing zip</span>
              <input type="text" name="billZip" defaultValue={billing.zip ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Billing country</span>
              <input type="text" name="billCountry" defaultValue={billing.country ?? "US"} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Card type</span>
              <select name="cardType" defaultValue={cardTypeCode} className={selectCls}>
                <option value="">— other / none —</option>
                <option value="VISA">Visa</option>
                <option value="MASTERCARD">Mastercard</option>
                <option value="DISCOVER">Discover</option>
                <option value="AMEX">American Express</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Card last 4</span>
              <input
                type="text"
                name="cardLast4"
                defaultValue={cardLast4}
                maxLength={4}
                placeholder="leave blank to keep current"
                className={inputCls}
              />
            </label>
            <div className="flex items-end sm:col-span-2">
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
                Save changes
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Notes</h2>
          <form action={clientNoteForm} className="mt-3 flex gap-2">
            <input type="hidden" name="clientId" value={client.id} />
            <input
              type="text"
              name="note"
              required
              placeholder="Add a note…"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Add</button>
          </form>
          <ul className="mt-4 space-y-3">
            {client.notes.map((note) => (
              <li key={note.id} className="border-l-2 border-zinc-200 pl-3">
                <p className="text-sm text-zinc-800">{note.note}</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-400">
                    {note.userId ? noteUserById.get(note.userId) ?? "unknown user" : "admin"} ·{" "}
                    {note.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </p>
                  <form action={clientNoteDeleteForm}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="clientId" value={client.id} />
                    <button className="text-xs text-zinc-400 hover:text-red-600">delete</button>
                  </form>
                </div>
              </li>
            ))}
            {client.notes.length === 0 && <li className="text-sm text-zinc-400">No notes yet.</li>}
          </ul>
        </section>
      </div>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Invoices ({client.invoices.length})
      </h2>
      <p className="mt-1 text-xs text-zinc-400">
        <Link href={invoiceListHref} className="underline hover:text-zinc-600">
          Manage in the invoices screen
        </Link>{" "}
        — refund / void / chargeback actions live there.
      </p>
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
          {client.invoices.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-sm text-zinc-400">
                No invoices yet.{" "}
                <Link href="/admin/invoices" className="underline hover:text-zinc-600">
                  Create one from the invoices screen
                </Link>
                .
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <section className="mt-8 rounded-xl border border-red-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-500">Danger zone</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Clients with invoices cannot be deleted — remove or reassign their invoices first.
        </p>
        <form action={clientDeleteForm} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="clientId" value={client.id} />
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" required className="rounded border-zinc-300" />
            Yes, delete this client
          </label>
          <button className="rounded-lg border border-red-300 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50">
            Delete client
          </button>
        </form>
      </section>
    </div>
  );
}

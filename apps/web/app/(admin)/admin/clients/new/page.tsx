import Link from "next/link";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { clientAddForm } from "../actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Add Client | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-600">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className={inputCls}
      />
    </label>
  );
}

export default async function AdminClientNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("clients");
  const { error, ok } = await searchParams;
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 500,
  });

  return (
    <div className="max-w-3xl">
      <Link href="/admin/clients" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to clients
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Add client</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Create a client manually, or convert one from a lead on the lead detail page. Fields
        mirror the legacy Canopy Add Client form (card is stored masked — last 4 only).
      </p>
      <FlashBanner error={error} ok={ok} />

      <form action={clientAddForm} className="mt-6 space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Contact &amp; source
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
            <Field label="Email" name="email" type="email" />
            <Field
              label="Campaign ID"
              name="campaignId"
              placeholder="e.g. cmp-google-search"
            />
            <Field label="Home phone" name="phoneHome" type="tel" />
            <Field label="Work phone" name="phoneWork" type="tel" />
            <Field label="Cell phone" name="phoneCell" type="tel" />
            <label className="block text-sm">
              <span className="text-zinc-600">Assigned representative</span>
              <select name="assignedToId" className={selectCls}>
                <option value="">— none —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Billing address (legacy BillAddress…)
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Billing address" name="billAddress1" />
            </div>
            <Field label="Billing city" name="billCity" />
            <Field label="Billing state" name="billState" />
            <Field label="Billing zip" name="billZip" />
            <Field label="Billing country" name="billCountry" placeholder="US" />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Card on file
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Full card numbers are never stored — only brand + last 4 (like legacy MaskedCard). Use
            the value here as a reference; actual charges run through Stripe payment links or the
            checkout, and are recorded as invoices.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-zinc-600">Card type</span>
              <select name="cardType" defaultValue="" className={selectCls}>
                <option value="">— other / none —</option>
                <option value="VISA">Visa</option>
                <option value="MASTERCARD">Mastercard</option>
                <option value="DISCOVER">Discover</option>
                <option value="AMEX">American Express</option>
              </select>
            </label>
            <Field
              label="Last 4 of card"
              name="cardLast4"
              placeholder="e.g. 4242"
              maxLength={4}
            />
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="isPartial" className="rounded border-zinc-300" />
              <span className="text-zinc-600">
                Partial client (lead captured, payment not completed)
              </span>
            </label>
          </div>
        </section>

        <p className="text-xs text-zinc-400">First or last name is required.</p>
        <div className="flex gap-2">
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
            Create client
          </button>
          <Link
            href="/admin/clients"
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

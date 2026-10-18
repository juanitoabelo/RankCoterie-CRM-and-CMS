import Link from "next/link";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { LEAD_DISPOSITIONS, LEAD_INTAKE_SECTIONS } from "@/modules/leads";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { IntakeSectionFields } from "@/components/admin/LeadIntakeFields";
import { leadAddForm } from "../actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Add Lead | Admin" };

const DISPOSITIONS = LEAD_DISPOSITIONS.filter((d) => d !== "CONVERTED");

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm";

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-600">{label}</span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={inputCls}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue = "",
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-zinc-600">{label}</span>
      <select name={name} defaultValue={defaultValue} className={selectCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function AdminLeadNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("leads");
  const { error, ok } = await searchParams;
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, firstName: true, lastName: true, email: true, isRep: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 500,
  });
  const userOptions = [
    { value: "", label: "— none —" },
    ...users.map((u) => ({
      value: u.id,
      label: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
    })),
  ];

  return (
    <div className="max-w-3xl">
      <Link href="/admin/leads" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to leads
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">Add lead</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Create a lead manually. Inbound leads from the public listing contact form land here
        automatically (also visible on the listing&apos;s analytics page). Fields mirror the legacy
        Canopy Add Lead form.
      </p>
      <FlashBanner error={error} ok={ok} />

      <form action={leadAddForm} className="mt-6 space-y-6">
        {/* Source & assignment — legacy CampaignID / Status / CSUserID */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Source &amp; assignment
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field
              label="Campaign ID (where is lead from?)"
              name="campaignId"
              placeholder="e.g. cmp-google-search"
            />
            <SelectField
              label="Status"
              name="status"
              defaultValue="NEW"
              options={[
                { value: "NEW", label: "NEW" },
                { value: "OPEN", label: "OPEN" },
              ]}
            />
            <SelectField
              label="Disposition"
              name="disposition"
              options={[{ value: "", label: "— none —" }, ...DISPOSITIONS.map((d) => ({ value: d, label: d }))]}
            />
            <SelectField label="Assigned rep" name="assignedToId" options={userOptions} />
          </div>
        </section>

        {/* Contact — legacy FirstName / LastName / Email / Home+Work+CellPhone / Street Address */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Contact</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
            <Field label="Email address" name="email" type="email" />
            <Field label="Phone number" name="phoneHome" type="tel" />
            <Field label="Work phone" name="phoneWork" type="tel" />
            <Field label="Cell phone" name="phoneCell" type="tel" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Street Address" name="shipAddress1" />
            </div>
            <Field label="City" name="shipCity" />
            <Field label="State" name="shipState" />
            <Field label="Zip Code" name="shipZip" />
            <Field label="Country" name="shipCountry" placeholder="US" />
          </div>
        </section>

        {/* Intake sections — rendered from the shared legacy-aligned schema */}
        {LEAD_INTAKE_SECTIONS.map((section) => (
          <details key={section.key} className="rounded-xl border border-zinc-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {section.title}
              {section.hint ? <span className="ml-2 font-normal normal-case text-zinc-400">({section.hint})</span> : null}
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <IntakeSectionFields section={section.key} />
            </div>
          </details>
        ))}

        <p className="text-xs text-zinc-400">First or last name is required.</p>
        <div className="flex gap-2">
          <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
            Create lead
          </button>
          <Link
            href="/admin/leads"
            className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

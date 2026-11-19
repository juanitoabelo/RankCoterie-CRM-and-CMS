import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { getCrmSequences } from "@/modules/crm/sequences";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { createSequenceForm } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email Sequences | CRM" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

export default async function CrmSequencesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSection("crm");
  const { error } = await searchParams;
  const sequences = await getCrmSequences();

  return (
    <div>
      <FlashBanner error={error} />
      <h1 className="text-2xl font-semibold text-zinc-900">Email sequences</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Multi-step email follow-ups from a connected Gmail or Microsoft mailbox.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            New sequence
          </h2>
          <form action={createSequenceForm} className="mt-3 space-y-3">
            <label className="block text-sm">
              <span className="text-zinc-600">Name</span>
              <input name="name" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Description</span>
              <input name="description" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">First email subject</span>
              <input name="subject" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">First email body</span>
              <textarea name="body" required rows={5} className={inputCls} />
            </label>
            <p className="text-xs text-zinc-500">
              Merge fields: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}, {"{{dealTitle}}"}
            </p>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
              Create sequence
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">All sequences</h2>
          {sequences.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No sequences yet.</p>
          ) : (
            <div className="mt-3 space-y-2 overflow-x-auto">
              {sequences.map((sequence) => (
                <Link
                  key={sequence.id}
                  href={`/admin/crm/sequences/${sequence.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 hover:bg-zinc-50"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{sequence.name}</p>
                    <p className="text-xs text-zinc-500">
                      {sequence._count.steps} steps · {sequence._count.enrollments} enrolled
                    </p>
                  </div>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {sequence.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

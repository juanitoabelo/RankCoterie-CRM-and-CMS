import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmEmailConnections } from "@/modules/crm/oauth-sync";
import { getCrmSequence } from "@/modules/crm/sequences";
import { FlashBanner } from "@/components/admin/FlashBanner";
import {
  addSequenceStepForm,
  enrollSequenceForm,
  setSequenceStatusForm,
} from "../actions";

export const dynamic = "force-dynamic";

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function CrmSequenceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const { id } = await params;
  const { error } = await searchParams;
  const [sequence, connections] = await Promise.all([
    getCrmSequence(id),
    getCrmEmailConnections(access.isAdmin ? undefined : user.id),
  ]);
  if (!sequence) notFound();

  return (
    <div>
      <FlashBanner error={error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/crm/sequences" className="text-sm text-zinc-500 hover:underline">
            ← Sequences
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{sequence.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">{sequence.description || "No description."}</p>
        </div>
        <form action={setSequenceStatusForm} className="flex items-center gap-2">
          <input type="hidden" name="sequenceId" value={sequence.id} />
          <select name="status" defaultValue={sequence.status} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
          <button className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm text-white">Update</button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Steps</h2>
          <div className="mt-3 space-y-3">
            {sequence.steps.map((step) => (
              <div key={step.id} className="rounded-lg border border-zinc-200 p-3">
                <p className="text-sm font-medium text-zinc-900">
                  {step.position + 1}. {step.subject}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600">{step.body}</p>
                <p className="mt-1 text-xs text-zinc-400">Delay {step.delayMinutes} minutes</p>
              </div>
            ))}
          </div>
          <form action={addSequenceStepForm} className="mt-4 space-y-3 border-t border-zinc-100 pt-4">
            <input type="hidden" name="sequenceId" value={sequence.id} />
            <label className="block text-sm">
              <span className="text-zinc-600">Subject</span>
              <input name="subject" required className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Body</span>
              <textarea name="body" required rows={4} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Delay after previous step (minutes)</span>
              <input name="delayMinutes" type="number" min="0" defaultValue="0" className={inputCls} />
            </label>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Add step</button>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Enroll contact</h2>
          <form action={enrollSequenceForm} className="mt-3 space-y-3">
            <input type="hidden" name="sequenceId" value={sequence.id} />
            <label className="block text-sm">
              <span className="text-zinc-600">Mailbox</span>
              <select name="connectionId" required className={inputCls}>
                <option value="">Choose a connected mailbox</option>
                {connections.map((connection) => (
                  <option key={connection.id} value={connection.id}>
                    {connection.email} ({connection.provider})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Recipient email</span>
              <input name="toEmail" type="email" required className={inputCls} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-zinc-600">First name</span>
                <input name="firstName" className={inputCls} />
              </label>
              <label className="block text-sm">
                <span className="text-zinc-600">Last name</span>
                <input name="lastName" className={inputCls} />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input name="leadId" placeholder="Lead ID" className={inputCls} />
              <input name="dealId" placeholder="Deal ID" className={inputCls} />
              <input name="clientId" placeholder="Client ID" className={inputCls} />
            </div>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Enroll</button>
          </form>
          {connections.length === 0 ? (
            <p className="mt-3 text-xs text-amber-700">
              Connect a mailbox in CRM settings before enrolling contacts.
            </p>
          ) : null}
        </section>
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Enrollments</h2>
        <div className="mt-3 space-y-3 overflow-x-auto">
          {sequence.enrollments.length === 0 ? (
            <p className="text-sm text-zinc-500">No enrollments yet.</p>
          ) : (
            sequence.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-lg border border-zinc-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{enrollment.toEmail}</p>
                  <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                    {enrollment.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Step {enrollment.currentStep + 1} · Next {formatDate(enrollment.nextSendAt)}
                </p>
                {enrollment.messages.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                    {enrollment.messages.map((message) => {
                      const badges = [
                        message.openCount > 0 ? `${message.openCount} opened` : null,
                        message.clickCount > 0 ? `${message.clickCount} clicked` : null,
                        message.bouncedAt ? "bounced" : null,
                        message.unsubscribedAt ? "unsubscribed" : null,
                        message.failedAt ? "failed" : null,
                      ].filter(Boolean);
                      return (
                        <li key={message.id} className="flex flex-wrap items-center gap-2">
                          <span>
                            {formatDate(message.sentAt)} — {message.subject}
                          </span>
                          {badges.length > 0 && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700">
                              {badges.join(" · ")}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

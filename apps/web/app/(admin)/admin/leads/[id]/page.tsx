import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import {
  LEAD_DISPOSITIONS,
  LEAD_INTAKE_FIELD_MAP,
  LEAD_INTAKE_SECTIONS,
  formatIntakeValue,
} from "@/modules/leads";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { IntakeSectionFields } from "@/components/admin/LeadIntakeFields";
import {
  leadStatusForm,
  leadNoteForm,
  leadNoteDeleteForm,
  leadTodoForm,
  leadTodoAddForm,
  leadTodoDeleteForm,
  leadAssignForm,
  leadConvertForm,
  leadIntakeForm,
  leadIntakeFormFields,
  leadContactForm,
  leadDeleteForm,
} from "../actions";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata = { title: "Lead | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm";

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  await requireSection("leads");
  const { id } = await params;
  const { error, ok } = await searchParams;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: "desc" } }, todos: { orderBy: { createdAt: "asc" } }, client: { select: { id: true } } },
  });
  if (!lead) notFound();

  const noteUserIds = [...new Set(lead.notes.map((n) => n.userId).filter(Boolean))] as string[];
  const [users, assignedUser, noteUsers] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: lead.tenantId },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    lead.assignedToId
      ? prisma.user.findUnique({
          where: { id: lead.assignedToId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : null,
    noteUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: noteUserIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const userName = (u: { firstName: string | null; lastName: string | null; email: string } | null) =>
    u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email : null;
  const noteUserById = new Map(noteUsers.map((u) => [u.id, userName(u)]));
  const assignedName = userName(assignedUser);
  const existingClient = lead.client;
  const isConverted = lead.status === "CLOSED" && lead.disposition === "CONVERTED";

  const intake = (lead.intake ?? {}) as Record<string, unknown>;
  /** Keys not in the shared schema (legacy-migrated or custom) — shown read-only. */
  const legacyOnlyKeys = Object.keys(intake).filter((k) => !LEAD_INTAKE_FIELD_MAP[k]);
  const describeIntakeValue = (key: string) =>
    formatIntakeValue(
      { key, label: key, type: typeof intake[key] === "boolean" ? "yesno" : "text", section: "lead" },
      intake[key],
    );
  const phones = (Array.isArray(lead.phones) ? lead.phones : []) as { number?: string; kind?: string }[];
  const addresses = (Array.isArray(lead.addresses) ? lead.addresses : []) as {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    kind?: string;
  }[];
  const phoneOf = (kind: string) => phones.find((p) => p.kind === kind)?.number ?? "";
  const shipping = addresses.find((a) => a.kind === "shipping") ?? {};

  const statusOptions = ["NEW", "OPEN", "CLOSED", "ARCHIVED"];

  return (
    <div>
      <Link href="/admin/leads" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Back to leads
      </Link>
      <FlashBanner error={error} ok={ok} />
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            {lead.firstName} {lead.lastName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {lead.email ?? "no email"} · created {lead.createdAt.toISOString().slice(0, 10)} ·{" "}
            {lead.status}
            {lead.disposition ? ` · ${lead.disposition}` : ""}
            {assignedName ? ` · assigned to ${assignedName}` : " · unassigned"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <form action={leadStatusForm} className="flex gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <select name="status" defaultValue={lead.status} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              {statusOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select name="disposition" defaultValue={lead.disposition ?? ""} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
              <option value="">— no disposition —</option>
              {LEAD_DISPOSITIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
              Update status
            </button>
          </form>
          <div className="flex items-center gap-2">
            <form action={leadAssignForm} className="flex items-center gap-2">
              <input type="hidden" name="leadId" value={lead.id} />
              <select
                name="userId"
                defaultValue={lead.assignedToId ?? ""}
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">— unassigned —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
                Assign
              </button>
            </form>
            {existingClient ? (
              <Link
                href={`/admin/clients/${existingClient.id}`}
                className="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
              >
                View client
              </Link>
            ) : (
              <form action={leadConvertForm}>
                <input type="hidden" name="leadId" value={lead.id} />
                <button
                  disabled={isConverted}
                  className="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isConverted ? "Converted" : "Convert to client"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Contact</h2>
          <form action={leadContactForm} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block text-sm">
              <span className="text-zinc-600">First name</span>
              <input type="text" name="firstName" defaultValue={lead.firstName ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Last name</span>
              <input type="text" name="lastName" defaultValue={lead.lastName ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">Email address</span>
              <input type="email" name="email" defaultValue={lead.email ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Phone number</span>
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
            <label className="block text-sm sm:col-span-2">
              <span className="text-zinc-600">Street Address</span>
              <input type="text" name="shipAddress1" defaultValue={shipping.line1 ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">City</span>
              <input type="text" name="shipCity" defaultValue={shipping.city ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">State</span>
              <input type="text" name="shipState" defaultValue={shipping.state ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Zip Code</span>
              <input type="text" name="shipZip" defaultValue={shipping.zip ?? ""} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-zinc-600">Country</span>
              <input type="text" name="shipCountry" defaultValue={shipping.country ?? "US"} className={inputCls} />
            </label>
            <div className="flex items-end sm:col-span-2">
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
                Save contact
              </button>
            </div>
          </form>
          <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">All phones</dt>
              <dd className="text-zinc-900">
                {phones.length > 0 ? phones.map((p) => `${p.number} (${p.kind ?? "?"})`).join(", ") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Landing page</dt>
              <dd className="text-zinc-900">{lead.landingPageId ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Initial disposition</dt>
              <dd className="text-zinc-900">{lead.initialDisposition ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Attribution</dt>
              <dd className="text-zinc-900">
                {[lead.campaignId, lead.productId, lead.publisherId, lead.subId, lead.clickId]
                  .filter(Boolean)
                  .join(" / ") || "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Clinical intake</h2>
          <form action={leadIntakeFormFields} className="mt-3 space-y-5">
            <input type="hidden" name="leadId" value={lead.id} />
            {LEAD_INTAKE_SECTIONS.map((section) => (
              <div key={section.key}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{section.title}</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <IntakeSectionFields section={section.key} values={intake} />
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-zinc-100 pt-4">
              <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">
                Save intake
              </button>
              <span className="text-xs text-zinc-400">
                Mirrors the legacy Lead information / Patient-child profile sections.
              </span>
            </div>
          </form>

          {legacyOnlyKeys.length > 0 && (
            <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
              {legacyOnlyKeys.map((k) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="max-w-[60%] break-words text-right text-zinc-900">
                    {describeIntakeValue(k)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <form action={leadIntakeForm} className="mt-4 border-t border-zinc-100 pt-4">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="block text-xs text-zinc-500">
              Raw intake JSON (replaces everything above, including custom keys)
              <textarea
                name="intake"
                rows={6}
                defaultValue={JSON.stringify(intake, null, 2)}
                placeholder="{}"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 font-mono text-xs"
              />
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
                Save raw JSON
              </button>
              <span className="text-xs text-zinc-400">Must be valid JSON object.</span>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            To do items ({lead.todos.filter((t) => !t.finishedAt).length} open)
          </h2>
          <form action={leadTodoAddForm} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <label className="flex-1 min-w-[16rem] text-xs text-zinc-500">
              Add a new to-do item for {lead.firstName} {lead.lastName}
              <input
                type="text"
                name="text"
                required
                placeholder="Follow up by phone, then by email if unavailable."
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Reminder Date
              <input type="date" name="dueAt" className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm" />
            </label>
            <label className="text-xs text-zinc-500">
              User
              <select
                name="assigneeId"
                defaultValue={lead.assignedToId ?? ""}
                className="mt-1 block rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
              >
                <option value="">— lead owner —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">+ Add to do</button>
          </form>
          <ul className="mt-4 space-y-2 text-sm">
            {lead.todos.map((todo) => (
              <li key={todo.id} className="flex items-start justify-between gap-3">
                <form action={leadTodoForm} className="flex flex-1 items-start gap-2">
                  <input type="hidden" name="todoId" value={todo.id} />
                  <button
                    type="submit"
                    className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${
                      todo.finishedAt ? "border-emerald-500 bg-emerald-500" : "border-zinc-300"
                    }`}
                    aria-label={todo.finishedAt ? "Reopen todo" : "Complete todo"}
                  />
                  <span className={todo.finishedAt ? "text-zinc-400 line-through" : "text-zinc-900"}>
                    {todo.text}
                    <span className="ml-2 text-xs uppercase text-zinc-400">
                      {todo.finishedAt ? "done" : "open"}
                    </span>
                    {todo.dueAt ? (
                      <span className="ml-2 text-xs text-zinc-400">
                        due {todo.dueAt.toISOString().slice(0, 10)}
                      </span>
                    ) : null}
                  </span>
                </form>
                <form action={leadTodoDeleteForm}>
                  <input type="hidden" name="todoId" value={todo.id} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <button className="text-xs text-zinc-400 hover:text-red-600" aria-label="Delete todo">
                    delete
                  </button>
                </form>
              </li>
            ))}
            {lead.todos.length === 0 && <li className="text-zinc-400">No to-dos.</li>}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Lead notes</h2>
          <form action={leadNoteForm} className="mt-3 flex gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <input
              type="text"
              name="note"
              required
              placeholder={`Add a new lead note for ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim()}
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            />
            <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">+ Add note</button>
          </form>
          <ul className="mt-4 space-y-3">
            {lead.notes.map((note) => (
              <li key={note.id} className="border-l-2 border-zinc-200 pl-3">
                <p className="text-sm text-zinc-800">{note.note}</p>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-400">
                    {note.userId ? noteUserById.get(note.userId) ?? "unknown user" : "admin"} ·{" "}
                    {note.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </p>
                  <form action={leadNoteDeleteForm}>
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="leadId" value={lead.id} />
                    <button className="text-xs text-zinc-400 hover:text-red-600">delete</button>
                  </form>
                </div>
              </li>
            ))}
            {lead.notes.length === 0 && <li className="text-sm text-zinc-400">No notes yet.</li>}
          </ul>
        </section>
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400">
        Campaign: {lead.campaignId ?? "—"}, Date: {lead.createdAt.toISOString().slice(0, 10)}, Lead
        ID: {lead.id}
      </p>

      <section className="mt-6 rounded-xl border border-red-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-500">Danger zone</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Deleting removes the lead, its notes and to-dos. A client created from this lead is kept
          (the link back to the lead is cleared).
        </p>
        <form action={leadDeleteForm} className="mt-3 flex items-center gap-3">
          <input type="hidden" name="leadId" value={lead.id} />
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input type="checkbox" required className="rounded border-zinc-300" />
            Yes, delete this lead
          </label>
          <button className="rounded-lg border border-red-300 px-4 py-1.5 text-sm text-red-700 hover:bg-red-50">
            Delete lead
          </button>
        </form>
      </section>
    </div>
  );
}

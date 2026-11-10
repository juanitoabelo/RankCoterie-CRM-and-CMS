import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { prisma, TENANT_ID } from "@/modules/shared";
import { normalizeCustomFormFields } from "@/modules/custom-forms/types";
import { SubmissionReply } from "../../../FormControls";
import { markCustomSubmissionRead } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function CustomFormSubmissionPage({ params }: { params: Promise<{ id: string; submissionId: string }> }) {
  await requireSection("general");
  const { id, submissionId } = await params;
  const submission = await prisma.customFormSubmission.findFirst({
    where: { id: submissionId, formId: id, tenantId: TENANT_ID },
    include: { form: true },
  });
  if (!submission) notFound();
  const values = submission.data && typeof submission.data === "object" ? submission.data as Record<string, unknown> : {};
  const fields = normalizeCustomFormFields(submission.form.fields);
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div><p className="text-sm text-zinc-500"><Link href={`/admin/custom-advance-form/${id}/submissions`} className="hover:underline">{submission.form.name} submissions</Link> / Submission</p>
        <h1 className="mt-1 text-2xl font-semibold">Form submission</h1>
        <p className="text-sm text-zinc-500">{submission.createdAt.toLocaleString()} · {submission.status}</p></div>
      {submission.status === "NEW" && <form action={markCustomSubmissionRead.bind(null, submission.id)}><button className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">Mark as read</button></form>}
      {submission.notificationError && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Email delivery issue: {submission.notificationError}</div>}
      <section className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white px-5">
        {fields.map((field) => <div key={field.key} className="py-4">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{field.label}</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{String(values[field.key] ?? "—")}</div>
        </div>)}
      </section>
      {submission.leadId && <p className="text-sm">CRM record: <Link className="underline" href={`/admin/leads/${submission.leadId}`}>Open lead</Link></p>}
      {submission.reply && <section className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="font-semibold">Last reply</h2><p className="mt-2 whitespace-pre-wrap text-sm">{submission.reply}</p><p className="mt-2 text-xs text-zinc-500">{submission.repliedAt?.toLocaleString()}</p></section>}
      <SubmissionReply submissionId={submission.id} />
    </div>
  );
}

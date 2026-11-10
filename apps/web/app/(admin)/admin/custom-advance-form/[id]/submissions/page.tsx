import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { prisma, TENANT_ID } from "@/modules/shared";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

export default async function CustomFormSubmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  await requireSection("general");
  const [{ id }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const form = await prisma.customForm.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!form) notFound();
  const where = { tenantId: TENANT_ID, formId: form.id };
  const [items, total] = await Promise.all([
    prisma.customFormSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customFormSubmission.count({ where }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm text-zinc-500"><Link href="/admin/custom-advance-form" className="hover:underline">System Tools / Custom Advance Form</Link> / Submissions</p>
          <h1 className="mt-1 text-2xl font-semibold">Submissions: {form.name}</h1></div>
        <Link href={`/admin/custom-advance-form/${form.id}`} className="rounded-lg border px-3 py-2 text-sm">Edit form</Link>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        {items.length ? <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Lead</th><th className="px-4 py-3"></th></tr></thead>
          <tbody className="divide-y divide-zinc-100">{items.map((submission) => {
            const values = submission.data && typeof submission.data === "object" ? submission.data as Record<string, unknown> : {};
            const emailField = Array.isArray(form.fields) ? form.fields.find((field) => field && typeof field === "object" && (field as { type?: string }).type === "email") as { key?: string } | undefined : undefined;
            const email = emailField?.key ? String(values[emailField.key] ?? "") : "";
            return <tr key={submission.id}>
              <td className="whitespace-nowrap px-4 py-3">{submission.createdAt.toLocaleString()}</td>
              <td className="px-4 py-3">{email || "—"}</td>
              <td className="px-4 py-3">{submission.status}{submission.notificationError ? <span className="ml-2 text-red-700" title={submission.notificationError}>Email issue</span> : ""}</td>
              <td className="px-4 py-3">{submission.leadId ? <Link className="underline" href={`/admin/leads/${submission.leadId}`}>View lead</Link> : "—"}</td>
              <td className="px-4 py-3"><Link className="underline" href={`/admin/custom-advance-form/${form.id}/submissions/${submission.id}`}>View</Link></td>
            </tr>;
          })}</tbody>
        </table> : <p className="px-5 py-8 text-sm text-zinc-500">No submissions on this page.</p>}
      </div>
      {totalPages > 0 && <div className="flex items-center justify-between text-sm text-zinc-600">
        <span>{total} total · Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          {page > 1 && <Link className="rounded-lg border px-3 py-1.5" href={`/admin/custom-advance-form/${id}/submissions?page=${page - 1}`}>Previous</Link>}
          {page < totalPages && <Link className="rounded-lg border px-3 py-1.5" href={`/admin/custom-advance-form/${id}/submissions?page=${page + 1}`}>Next</Link>}
        </div>
      </div>}
    </div>
  );
}

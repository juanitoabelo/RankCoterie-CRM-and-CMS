import Link from "next/link";
import { requireSection } from "@/modules/auth";
import { prisma, TENANT_ID } from "@/modules/shared";
import { NewCustomForm } from "./FormControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom Advance Form | Admin" };

export default async function CustomFormsPage() {
  await requireSection("general");
  const forms = await prisma.customForm.findMany({
    where: { tenantId: TENANT_ID },
    include: { _count: { select: { submissions: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-zinc-500">Admin / System Tools /</p>
        <h1 className="text-2xl font-semibold text-zinc-900">Custom Advance Form</h1>
        <p className="mt-1 text-sm text-zinc-600">Create reusable forms, configure email and CRM lead capture, and review submissions.</p>
      </header>
      <section className="rounded-xl border border-zinc-200 bg-white p-5"><NewCustomForm /></section>
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-5 py-4"><h2 className="font-semibold">Forms</h2></div>
        {forms.length ? <div className="divide-y divide-zinc-100">
          {forms.map((form) => (
            <div key={form.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div><Link className="font-medium text-zinc-900 hover:underline" href={`/admin/custom-advance-form/${form.id}`}>{form.name}</Link>
                <p className="mt-1 text-xs text-zinc-500">{form.status} · {form._count.submissions} submissions · Updated {form.updatedAt.toLocaleDateString()}</p></div>
              <Link className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" href={`/admin/custom-advance-form/${form.id}/submissions`}>Submissions</Link>
            </div>
          ))}
        </div> : <p className="px-5 py-8 text-sm text-zinc-500">No forms created yet.</p>}
      </section>
    </div>
  );
}

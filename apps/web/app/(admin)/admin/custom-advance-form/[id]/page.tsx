import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { prisma, TENANT_ID } from "@/modules/shared";
import { normalizeCustomFormFields, normalizeCustomFormSettings } from "@/modules/custom-forms/types";
import { CustomFormEditor } from "../FormControls";

export const dynamic = "force-dynamic";

export default async function EditCustomFormPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSection("general");
  const { id } = await params;
  const form = await prisma.customForm.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!form) notFound();
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-zinc-500"><Link href="/admin/custom-advance-form" className="hover:underline">Admin / System Tools / Custom Advance Form</Link> / Edit</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{form.name}</h1>
      </div>
      <CustomFormEditor initial={{
        id: form.id,
        name: form.name,
        status: form.status,
        fields: normalizeCustomFormFields(form.fields),
        settings: normalizeCustomFormSettings(form.settings),
      }} />
    </div>
  );
}

import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import SectionEditForm from "./SectionEditForm";
import CustomFieldsPanel from "@/components/admin/custom-fields/CustomFieldsPanel";

export const revalidate = 0;

export default async function SectionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("sections");
  const { id } = await params;
  const section = await prisma.section.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: { category: { select: { slug: true, title: true } } },
  });
  if (!section) return notFound();

  return (
    <div>
      <SectionEditForm section={section} />
      <div className="mx-auto mt-8 max-w-4xl">
        <CustomFieldsPanel contentType="section" recordId={section.id} />
      </div>
    </div>
  );
}

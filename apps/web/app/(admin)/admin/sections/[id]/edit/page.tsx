import { notFound } from "next/navigation";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import SectionEditForm from "./SectionEditForm";

export const revalidate = 0;

export default async function SectionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("sections");
  const { id } = await params;
  const section = await prisma.section.findFirst({ where: { id, tenantId: TENANT_ID } });
  if (!section) return notFound();

  return <SectionEditForm section={section} />;
}

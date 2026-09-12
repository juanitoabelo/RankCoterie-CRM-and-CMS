import { notFound } from "next/navigation";
import { getCategory, getCategoryOptions } from "../../actions";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import TopicEditForm from "./TopicEditForm";

export const revalidate = 0;

export default async function TopicEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) return notFound();

  const [allCategories, geoCategoryOptions] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true },
    }),
    prisma.category.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <TopicEditForm
      category={category}
      allCategories={allCategories}
      geoCategoryOptions={geoCategoryOptions}
    />
  );
}

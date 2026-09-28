import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCategory, getCategoryOptions } from "../../actions";
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
import TopicEditForm from "./TopicEditForm";

type TopicSection = { title: string; content: string };

/**
 * `sections` is a JSON column, so Prisma hands back `JsonValue`. Narrow it to
 * the shape the form renders, dropping any malformed entry rather than letting
 * it crash the page.
 */
function toSections(value: Prisma.JsonValue | null): TopicSection[] | null {
  if (!Array.isArray(value)) return null;
  const sections = value.filter((entry): entry is TopicSection => {
    if (typeof entry !== "object" || entry === null) return false;
    const { title, content } = entry as { title?: unknown; content?: unknown };
    return typeof title === "string" && typeof content === "string";
  });
  return sections.length > 0 ? sections : null;
}

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
      category={{ ...category, sections: toSections(category.sections) }}
      allCategories={allCategories}
      geoCategoryOptions={geoCategoryOptions}
    />
  );
}

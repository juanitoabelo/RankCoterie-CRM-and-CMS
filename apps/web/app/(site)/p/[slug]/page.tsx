import { prisma } from "@/lib/directory/prismaCatalog";
import BlockRenderer from "@/components/admin/page-builder/BlockRenderer";
import type { Block } from "@/lib/page-builder/types";

export const revalidate = 0;

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await prisma.page.findFirst({
    where: {
      slug,
      status: "LIVE",
    },
  });

  if (!page) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900">Page not found</h1>
          <p className="mt-2 text-zinc-500">The page you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const blocks: Block[] = page.data ? JSON.parse(page.data) : [];

  return (
    <div>
      {page.title && (
        <title>{page.title}</title>
      )}
      <BlockRenderer blocks={blocks} />
    </div>
  );
}

import { prisma } from "@/lib/directory/prismaCatalog";
import PageBuilder from "@/components/admin/page-builder/PageBuilder";
import PageMetaEditor from "./PageMetaEditor";
import { updatePageBlocks } from "../../actions";

export const revalidate = 0;

export default async function PageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) {
    return <p className="text-sm text-zinc-500">Page not found.</p>;
  }

  const blocks = page.data ? JSON.parse(page.data) : [];

  const saveBlocks = async (pageId: string, blocksJson: string) => {
    "use server";
    return updatePageBlocks(pageId, blocksJson);
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/pages" className="hover:text-zinc-700">Pages</a> /{" "}
        <span className="text-zinc-700">{page.name}</span>
      </p>
      <div className="mt-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Edit: {page.title || page.name}
        </h1>
        {page.slug && (
          <a
            href={`/p/${page.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
          >
            View live ↗
          </a>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Page settings</h2>
        <PageMetaEditor page={page} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Page content</h2>
        <PageBuilder
          pageId={page.id}
          initialBlocks={blocks}
          onSave={saveBlocks}
        />
      </div>
    </div>
  );
}

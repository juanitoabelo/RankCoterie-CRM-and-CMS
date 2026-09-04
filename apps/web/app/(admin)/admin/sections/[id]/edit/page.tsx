import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/directory/prismaCatalog";
import { requireSection } from "@/lib/admin-auth";
import { updateSectionForm, deleteSectionForm } from "../../actions";
import { TENANT_ID } from "@/lib/tenant";

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

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Content Types</span> /{" "}
        <Link href="/admin/sections" className="text-zinc-700 hover:underline">Sections</Link>{" "}
        / <span className="text-zinc-700">Edit</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit section</h1>

      <form action={updateSectionForm} className="mt-6 max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <input type="hidden" name="id" value={section.id} />
        <label className="block text-xs font-medium text-zinc-600">
          Slug
          <input
            name="slug"
            required
            defaultValue={section.slug}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Title
          <input
            name="title"
            required
            defaultValue={section.title}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Heading (display title)
          <input
            name="heading"
            defaultValue={section.heading ?? ""}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Body / intro (HTML)
          <textarea
            name="body"
            rows={5}
            defaultValue={section.body ?? ""}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Order
          <input
            type="number"
            name="order"
            defaultValue={section.order}
            className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Status
          <select name="status" defaultValue={section.status} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
            <option value="LIVE">LIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="HIDDEN">HIDDEN</option>
          </select>
        </label>
        <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
          <button
            type="submit"
            formAction={deleteSectionForm}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete section
          </button>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

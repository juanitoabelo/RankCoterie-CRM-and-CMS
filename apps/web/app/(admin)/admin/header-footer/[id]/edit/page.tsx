import { notFound } from "next/navigation";
import {
  getHeaderFooter,
  updateHeaderFooterBlocks,
  listRevisions,
  restoreRevision,
  updateHeaderFooterMetaAction,
  getAssignments,
  saveAssignmentsAction,
} from "../../actions";
import HeaderFooterBuilder from "@/components/admin/header-footer-builder/HeaderFooterBuilder";

export const revalidate = 0;

export default async function HeaderFooterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getHeaderFooter(id);
  if (!template) notFound();

  const blocks = template.data ? JSON.parse(template.data) : [];
  const assignments = await getAssignments(id);

  const saveBlocks = async (
    templateId: string,
    blocksJson: string,
    opts?: { createRevision?: boolean },
  ) => {
    "use server";
    return updateHeaderFooterBlocks(templateId, blocksJson, opts);
  };

  const loadRevisions = async (templateId: string) => {
    "use server";
    return listRevisions(templateId);
  };

  const restore = async (templateId: string, revisionId: string) => {
    "use server";
    return restoreRevision(templateId, revisionId);
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Header & Footer Builder</span> /{" "}
        <span className="text-zinc-700">{template.name}</span>
      </p>

      <HeaderFooterBuilder
        templateId={template.id}
        templateName={template.name}
        templateType={template.type as "HEADER" | "FOOTER"}
        initialBlocks={blocks}
        isDefault={template.isDefault}
        initialAssignments={assignments}
        onSave={saveBlocks}
        onListRevisions={loadRevisions}
        onRestoreRevision={restore}
        onSaveMeta={updateHeaderFooterMetaAction}
        onSaveAssignments={saveAssignmentsAction}
      />
    </div>
  );
}

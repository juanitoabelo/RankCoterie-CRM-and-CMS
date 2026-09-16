import { notFound } from "next/navigation";
import {
  getPageLayout,
  updatePageLayoutBlocks,
  listRevisions,
  restoreRevision,
  updatePageLayoutMetaAction,
  getAssignments,
  saveAssignmentsAction,
} from "../../actions";
import { getThemeSettings } from "../../../theme-settings/actions";
import PageLayoutBuilder from "@/components/admin/page-layout-builder/PageLayoutBuilder";
import { parsePageLayoutData } from "@/modules/page-layout";

export const revalidate = 0;

export default async function PageLayoutEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getPageLayout(id);
  if (!template) notFound();

  const { blocks, containerSettings } = parsePageLayoutData(template.data);
  const assignments = await getAssignments(id);
  const themeSettings = await getThemeSettings();

  const themeColors = [
    { key: "background", label: "Background", color: themeSettings.colors.background },
    { key: "text", label: "Text", color: themeSettings.colors.text },
    { key: "accent", label: "Accent", color: themeSettings.colors.accent },
    { key: "headingColor", label: "Heading", color: themeSettings.colors.headingColor },
    { key: "linkColor", label: "Link", color: themeSettings.colors.linkColor },
    { key: "buttonBg", label: "Button BG", color: themeSettings.colors.buttonBg },
    { key: "buttonText", label: "Button Text", color: themeSettings.colors.buttonText },
    { key: "surface", label: "Surface", color: themeSettings.colors.surface },
    { key: "border", label: "Border", color: themeSettings.colors.border },
    { key: "muted", label: "Muted", color: themeSettings.colors.muted },
    { key: "success", label: "Success", color: themeSettings.colors.success },
    { key: "warning", label: "Warning", color: themeSettings.colors.warning },
    { key: "error", label: "Error", color: themeSettings.colors.error },
  ];

  const saveBlocks = async (
    templateId: string,
    blocksJson: string,
    opts?: { createRevision?: boolean },
  ) => {
    "use server";
    return updatePageLayoutBlocks(templateId, blocksJson, opts);
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
        <span className="text-zinc-700">Page Layout Builder</span> /{" "}
        <span className="text-zinc-700">{template.name}</span>
      </p>

      <PageLayoutBuilder
        templateId={template.id}
        templateName={template.name}
        initialBlocks={blocks}
        initialContainerSettings={containerSettings}
        isDefault={template.isDefault}
        initialAssignments={assignments}
        themeColors={themeColors}
        onSave={saveBlocks}
        onListRevisions={loadRevisions}
        onRestoreRevision={restore}
        onSaveMeta={updatePageLayoutMetaAction}
        onSaveAssignments={saveAssignmentsAction}
      />
    </div>
  );
}

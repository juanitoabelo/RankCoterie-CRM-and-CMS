import { notFound } from "next/navigation";
import {
  getBlogTemplate,
  updateBlogTemplateBlocks,
  listRevisions,
  restoreRevision,
  updateBlogTemplateMetaAction,
  getAssignments,
  saveAssignmentsAction,
} from "../../actions";
import { getThemeSettings } from "../../../theme-settings/actions";
import BlogTemplateBuilder from "@/components/admin/blog-template-builder/BlogTemplateBuilder";
import { parseBlogTemplateData } from "@/modules/blog-template";

export const revalidate = 0;

export default async function BlogTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getBlogTemplate(id);
  if (!template) notFound();

  const { blocks, containerSettings } = parseBlogTemplateData(template.data);
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
    return updateBlogTemplateBlocks(templateId, blocksJson, opts);
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
        Admin / <span className="text-zinc-700">Content</span> /{" "}
        <span className="text-zinc-700">Blog Templates</span> /{" "}
        <span className="text-zinc-700">{template.name}</span>
      </p>

      <BlogTemplateBuilder
        templateId={template.id}
        templateName={template.name}
        templateType={template.type as "listing" | "single"}
        initialBlocks={blocks}
        initialContainerSettings={containerSettings}
        isDefault={template.isDefault}
        initialAssignments={assignments}
        themeColors={themeColors}
        onSave={saveBlocks}
        onListRevisions={loadRevisions}
        onRestoreRevision={restore}
        onSaveMeta={updateBlogTemplateMetaAction}
        onSaveAssignments={saveAssignmentsAction}
      />
    </div>
  );
}

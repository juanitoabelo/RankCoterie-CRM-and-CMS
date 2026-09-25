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
import { getThemeSettings } from "../../../theme-settings/actions";
import { getMenus } from "@/modules/menus";
import HeaderFooterBuilder from "@/components/admin/header-footer-builder/HeaderFooterBuilder";
import { parseHeaderFooterData } from "@/modules/header-footer";

export const revalidate = 0;

export default async function HeaderFooterEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getHeaderFooter(id);
  if (!template) notFound();

  const { blocks, containerSettings } = parseHeaderFooterData(template.data);
  const assignments = await getAssignments(id);
  const themeSettings = await getThemeSettings();

  const allMenus = await getMenus();
  const headerMenu = allMenus.find((m) => m.location === "HEADER");
  const footerMenu = allMenus.find((m) => m.location === "FOOTER");
  const menus = {
    header: headerMenu?.items ?? [],
    footer: footerMenu?.items ?? [],
  };

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
        initialContainerSettings={containerSettings}
        isDefault={template.isDefault}
        initialAssignments={assignments}
        themeColors={themeColors}
        menus={menus}
        onSave={saveBlocks}
        onListRevisions={loadRevisions}
        onRestoreRevision={restore}
        onSaveMeta={updateHeaderFooterMetaAction}
        onSaveAssignments={saveAssignmentsAction}
      />
    </div>
  );
}

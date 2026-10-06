import { notFound } from "next/navigation";
import type { Block } from "@/lib/page-builder/types";
import {
  getGeoCategoryTemplate,
  updateGeoCategoryTemplateBlocks,
  listGeoCategoryTemplateRevisions,
  restoreGeoCategoryTemplateRevisionAction,
  updateGeoCategoryTemplateMetaAction,
} from "../../actions";
import { getThemeSettings } from "../../../theme-settings/actions";
import GeoCategoryTemplateBuilder from "@/components/admin/geo-category-template-builder/GeoCategoryTemplateBuilder";
import { parseGeoCategoryTemplateData } from "@/modules/geo-category-template";
import { getCatalogRepo } from "@/lib/directory/catalog";
import type { GeoPreviewData } from "@/lib/geo-category-template/geo-bindings";

export const revalidate = 0;

export default async function GeoCategoryTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getGeoCategoryTemplate(id);
  if (!template) notFound();

  const { blocks, containerSettings } = parseGeoCategoryTemplateData(template.data);
  const [themeSettings, categories] = await Promise.all([
    getThemeSettings(),
    getCatalogRepo().then((repo) => repo.getCategories()),
  ]);

  const previewCategories: GeoPreviewData[] = categories.map((category) => ({
    id: category.id,
    category: {
      title: category.title,
      slug: category.slug,
      description: category.description,
      stateInit: category.stateInit,
      cityInit: category.cityInit,
      metaDesc: category.metaDesc,
      seoTitle: category.seoTitle,
      focusKeyphrase: category.focusKeyphrase,
    },
    categoryUrl: `/g/${category.slug}/`,
    statesCount: null,
    listingsCount: null,
  }));

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
    return updateGeoCategoryTemplateBlocks(templateId, blocksJson, opts);
  };

  const loadRevisions = async (templateId: string) => {
    "use server";
    return listGeoCategoryTemplateRevisions(templateId);
  };

  const restore = async (templateId: string, revisionId: string) => {
    "use server";
    return restoreGeoCategoryTemplateRevisionAction(templateId, revisionId);
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Geo-Targeting</span> /{" "}
        <span className="text-zinc-700">Geo Category Custom Single Page</span> /{" "}
        <span className="text-zinc-700">{template.name}</span>
      </p>

      <GeoCategoryTemplateBuilder
        templateId={template.id}
        templateName={template.name}
        templateLayout={template.layout === "SIDEBAR" ? "SIDEBAR" : "FULLWIDTH"}
        initialBlocks={blocks as unknown as Block[]}
        initialContainerSettings={containerSettings}
        isDefault={template.isDefault}
        previewCategories={previewCategories}
        themeColors={themeColors}
        onSave={saveBlocks}
        onListRevisions={loadRevisions}
        onRestoreRevision={restore}
        onSaveMeta={updateGeoCategoryTemplateMetaAction}
      />
    </div>
  );
}

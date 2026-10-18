import Link from "next/link";
import { notFound } from "next/navigation";
import ListingTemplateBuilder from "@/components/admin/listing-template-builder/ListingTemplateBuilder";
import { ThemeColorsProvider } from "@/components/admin/page-builder/ThemeColorsProvider";
import {
  getCompanyListingTemplate,
  updateCompanyListingTemplateBlocks,
} from "../../actions";
import { getListingPreviewOptions } from "../../../listing-layouts/actions";
import { getThemeSettings } from "../../../theme-settings/actions";
import {
  parseListingTemplateData,
  legacyToTreeTemplate,
  asPageBuilderBlock,
} from "@/lib/listing-templates/tree-types";
import type { SidebarWidget } from "@/lib/listing-templates/types";

export const revalidate = 0;

export default async function EditCompanyListingTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getCompanyListingTemplate(id);
  if (!template) notFound();

  const parsed = parseListingTemplateData(template.blocks);
  // Legacy flat templates are converted to the tree model in memory; the next
  // autosave persists the tree shape. Public pages keep rendering legacy
  // arrays with the old flat renderer until then.
  const { blocks, containerSettings } =
    parsed.model === "tree" || parsed.model === "empty"
      ? { blocks: parsed.blocks, containerSettings: parsed.containerSettings }
      : legacyToTreeTemplate(
          parsed.legacyBlocks,
          Array.isArray(template.sidebar) ? (template.sidebar as unknown as SidebarWidget[]) : [],
          template.layout,
          template.heroVariant,
        );

  const [themeSettings, previewListings] = await Promise.all([
    getThemeSettings(),
    getListingPreviewOptions(),
  ]);

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

  const saveBlocks = async (templateId: string, data: string) => {
    "use server";
    return updateCompanyListingTemplateBlocks(templateId, data);
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Directory</span> /{" "}
        <Link href="/admin/company-listing-layouts" className="text-zinc-700 hover:underline">Company Listing Custom Landing Page Layout</Link> /{" "}
        <span className="text-zinc-700">{template.name}</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit: {template.name}</h1>
      {template.isPreset && (
        <p className="mt-1 text-sm text-blue-700">This is a built-in preset &mdash; edits apply to every company page assigned to it.</p>
      )}
      {template.isDefault && (
        <p className="mt-1 text-sm text-amber-700">This is the site-wide default template &mdash; company pages without an explicit template use it.</p>
      )}
      {parsed.model === "legacy" && (
        <p className="mt-1 text-sm text-zinc-500">
          This template uses the older flat format &mdash; it has been converted for editing and will be saved in the new format on your first change.
        </p>
      )}
      <div className="mt-6">
        <ThemeColorsProvider colors={themeColors}>
          <ListingTemplateBuilder
            templateId={template.id}
            templateName={template.name}
            initialBlocks={blocks.map(asPageBuilderBlock)}
            initialContainerSettings={containerSettings}
            isDefault={template.isDefault}
            previewListings={previewListings}
            themeColors={themeColors}
            onSave={saveBlocks}
          />
        </ThemeColorsProvider>
      </div>
    </div>
  );
}
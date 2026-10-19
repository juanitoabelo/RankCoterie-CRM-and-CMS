import { notFound } from "next/navigation";
import type { Block } from "@/lib/page-builder/types";
import type { ContentPageKind } from "@/lib/content-page-template/types";
import { getContentPageTemplateAction } from "@/modules/content-page-template/actions";
import { parseContentPageTemplateData } from "@/modules/content-page-template/queries";
import { getThemeSettings } from "../../../theme-settings/actions";
import ContentPageTemplateEditView from "@/components/admin/content-page-template-builder/ContentPageTemplateEditView";

export const revalidate = 0;

export default async function TopicTemplateEditRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getContentPageTemplateAction(id);
  if (!template) notFound();

  const { blocks, containerSettings } = parseContentPageTemplateData(template.data);
  const themeSettings = await getThemeSettings();
  const kind = (template.kind === "subtopic" ? "subtopic" : "topic") as ContentPageKind;
  const noun = kind === "topic" ? "Topic" : "SubTopic";

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

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">{noun}s</span> /{" "}
        <span className="text-zinc-700">{noun} Custom Single Page</span> /{" "}
        <span className="text-zinc-700">{template.name}</span>
      </p>

      <ContentPageTemplateEditView
        id={template.id}
        name={template.name}
        kind={kind}
        layout={template.layout === "SIDEBAR" ? "SIDEBAR" : "FULLWIDTH"}
        isDefault={template.isDefault}
        blocks={blocks as unknown as Block[]}
        containerSettings={containerSettings}
        themeColors={themeColors}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import BlogTemplateBuilder from "@/components/admin/blog-template-builder/BlogTemplateBuilder";
import { ThemeColorsProvider } from "@/components/admin/page-builder/ThemeColorsProvider";
import type { ArticleBindingField, ArticleBindingValueType } from "@/lib/blog-template/article-bindings";
import { ARTICLE_BINDING_FIELDS } from "@/lib/blog-template/article-bindings";
import { parseBlogTemplateData } from "@/modules/blog-template";
import type { CustomFieldDefinition } from "@/modules/custom-fields/types";
import { getThemeSettings } from "../../../../theme-settings/actions";
import {
  getCustomPostTypeTemplateEditorData,
  listCustomPostTypeTemplateRevisions,
  restoreCustomPostTypeTemplateRevision,
  updateCustomPostTypeTemplateBlocks,
  updateCustomPostTypeTemplateMeta,
} from "../../../actions";

export const revalidate = 0;

function fieldValueType(field: CustomFieldDefinition): ArticleBindingValueType {
  if (field.type === "image") return "image";
  if (field.type === "file") return "url";
  if (field.type === "wysiwyg" || field.type === "textarea") return "richText";
  if (field.type === "date") return "date";
  if (field.type === "url" || field.type === "link") return "url";
  return "text";
}

function getBindingFields(coreFields: string[], customFields: CustomFieldDefinition[]): ArticleBindingField[] {
  const allowed = new Set<string>();
  if (coreFields.includes("title")) allowed.add("title");
  if (coreFields.includes("body")) allowed.add("body");
  if (coreFields.includes("excerpt")) allowed.add("excerpt");
  if (coreFields.includes("slug")) allowed.add("slug");
  if (coreFields.includes("featuredImage")) {
    allowed.add("featuredImage");
    allowed.add("featuredImageAlt");
    allowed.add("featuredImageCaption");
  }
  if (coreFields.includes("category")) {
    allowed.add("category.title");
    allowed.add("category.slug");
  }
  if (coreFields.includes("author")) allowed.add("author");
  if (coreFields.includes("seo")) {
    allowed.add("metaDesc");
    allowed.add("seoTitle");
    allowed.add("focusKeyphrase");
    allowed.add("ogImage");
  }
  allowed.add("createdAt");
  allowed.add("articleUrl");

  const core = ARTICLE_BINDING_FIELDS.filter((field) => allowed.has(field.key));
  const custom = customFields
    .filter((field) => !["password", "message", "tab", "accordion", "clone", "group", "repeater", "flexible_content"].includes(field.type))
    .map((field) => ({
      key: `customFields.${field.key}`,
      label: field.label,
      valueType: fieldValueType(field),
    }));
  return [...core, ...custom];
}

export default async function CustomPostTypeTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, themeSettings] = await Promise.all([
    getCustomPostTypeTemplateEditorData(id),
    getThemeSettings(),
  ]);
  if (!data) notFound();

  const { blocks, containerSettings } = parseBlogTemplateData(data.template.data);
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

  const saveBlocks = async (templateId: string, dataJson: string, opts?: { createRevision?: boolean }) => {
    "use server";
    return updateCustomPostTypeTemplateBlocks(templateId, dataJson, opts);
  };
  const loadRevisions = async (templateId: string) => {
    "use server";
    return listCustomPostTypeTemplateRevisions(templateId);
  };
  const restore = async (templateId: string, revisionId: string) => {
    "use server";
    return restoreCustomPostTypeTemplateRevision(templateId, revisionId);
  };
  const saveMeta = async (templateId: string, formData: FormData) => {
    "use server";
    return updateCustomPostTypeTemplateMeta(templateId, formData);
  };
  const saveAssignments = async () => {
    "use server";
    return { ok: true as const };
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / System Tools / Custom Fields &amp; Post Types / {data.postType.name} / {data.template.name}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        Single-page template for {data.postType.name}. Data bindings are limited to this post type&apos;s enabled fields and custom fields.
      </p>
      <ThemeColorsProvider colors={themeColors}>
        <BlogTemplateBuilder
          templateId={data.template.id}
          templateName={data.template.name}
          templateType="single"
          templateContextLabel="Custom Post Type Single Template"
          assignmentDescription="Assign this layout as the post type default or select it as an entry's single-page override."
          initialBlocks={blocks}
          initialContainerSettings={containerSettings}
          isDefault={false}
          initialAssignments={[]}
          themeColors={themeColors}
          bindingFields={getBindingFields(data.postType.coreFields, data.customFields)}
          onSave={saveBlocks}
          onListRevisions={loadRevisions}
          onRestoreRevision={restore}
          onSaveMeta={saveMeta}
          onSaveAssignments={saveAssignments}
        />
      </ThemeColorsProvider>
    </div>
  );
}

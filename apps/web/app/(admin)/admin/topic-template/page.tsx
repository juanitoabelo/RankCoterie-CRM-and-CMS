import ContentPageTemplateListPage from "@/components/admin/content-page-template-builder/ContentPageTemplateListPage";

export const revalidate = 0;

export default function TopicTemplateListRoute() {
  return <ContentPageTemplateListPage kind="topic" />;
}

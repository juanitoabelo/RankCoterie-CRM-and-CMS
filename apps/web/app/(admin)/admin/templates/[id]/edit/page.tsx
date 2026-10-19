import { notFound } from "next/navigation";
import { getSubTopic, getTopicOptions, getSectionOptions } from "../../actions";
import { listContentPageTemplatesAction } from "@/modules/content-page-template/actions";
import { getContentPageTemplateAssignment } from "@/modules/content-page-template";
import SubTopicEditForm from "./SubTopicEditForm";

export const revalidate = 0;

export default async function SubTopicEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subtopic = await getSubTopic(id);
  if (!subtopic) return notFound();

  const [topicOptions, sectionOptions, contentPageTemplates, assignment] = await Promise.all([
    getTopicOptions(),
    getSectionOptions(),
    listContentPageTemplatesAction("subtopic"),
    getContentPageTemplateAssignment(id),
  ]);

  return (
    <SubTopicEditForm
      subtopic={subtopic}
      topicOptions={topicOptions}
      sectionOptions={sectionOptions}
      contentPageTemplates={contentPageTemplates}
      assignedContentPageTemplateId={assignment?.contentPageTemplateId ?? null}
    />
  );
}

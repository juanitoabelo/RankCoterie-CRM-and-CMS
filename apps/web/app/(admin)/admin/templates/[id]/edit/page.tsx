import { notFound } from "next/navigation";
import { getSubTopic, getTopicOptions, getSectionOptions } from "../../actions";
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

  const [topicOptions, sectionOptions] = await Promise.all([
    getTopicOptions(),
    getSectionOptions(),
  ]);

  return (
    <SubTopicEditForm
      subtopic={subtopic}
      topicOptions={topicOptions}
      sectionOptions={sectionOptions}
    />
  );
}

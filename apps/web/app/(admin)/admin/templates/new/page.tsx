import { getTopicOptions } from "../actions";
import NewSubTopicForm from "./NewSubTopicForm";
import WordCounter from "@/components/admin/WordCounter";

export const revalidate = 0;

export default async function NewSubTopicPage() {
  const topicOptions = await getTopicOptions();

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/templates" className="hover:text-zinc-700">SubTopics</a> /{" "}
        <span className="text-zinc-700">Add New SubTopic</span>
      </p>
      <div className="flex items-start justify-between">
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add New SubTopic</h1>
        <span className="text-xs text-zinc-400">Help with SEO (search engine optimization)</span>
      </div>

      <NewSubTopicForm topicOptions={topicOptions} />

      <div className="mt-6">
        <WordCounter source="" />
      </div>
    </div>
  );
}

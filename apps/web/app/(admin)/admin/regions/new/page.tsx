import NewRegionForm from "./NewRegionForm";
import WordCounter from "@/components/admin/WordCounter";

export const revalidate = 0;

export default async function NewRegionPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-zinc-500">
        Admin / <a href="/admin/regions" className="hover:text-zinc-700">Regions</a> /{" "}
        <span className="text-zinc-700">Add New Region</span>
      </p>
      <div className="flex items-start justify-between">
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
          Add New Region <span className="text-blue-600">ⓘ</span>
        </h1>
        <span className="text-xs text-zinc-400">Help with SEO (search engine optimization) ⦿</span>
      </div>

      <NewRegionForm />

      <div className="mt-6">
        <WordCounter source="" />
      </div>
    </div>
  );
}

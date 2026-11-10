import { requireSection } from "@/modules/auth";
import { listCustomFieldAdminData } from "./actions";
import CustomFieldsAdmin from "./CustomFieldsAdmin";

export const revalidate = 0;

export default async function CustomFieldsPage() {
  await requireSection("general");
  const { groups, postTypes, templates } = await listCustomFieldAdminData();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Custom Fields &amp; Post Types</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Custom Fields &amp; Post Types</h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600">
        Configure reusable field groups for your content, then define custom post types with their own core fields and custom-field groups.
      </p>
      <div className="mt-7">
        <CustomFieldsAdmin groups={groups} postTypes={postTypes} templates={templates} />
      </div>
    </div>
  );
}

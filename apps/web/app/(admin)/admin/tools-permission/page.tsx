import { requireSection } from "@/modules/auth";
import { getPermissionMatrix } from "./actions";
import ToolsPermissionMatrix from "./ToolsPermissionMatrix";

export const revalidate = 0;

export default async function ToolsPermissionPage() {
  await requireSection("toolsPermission");
  const data = await getPermissionMatrix();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Tools Permission</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Tools Permission</h1>
      <p className="mt-2 max-w-3xl text-sm text-zinc-600">
        Control which dashboard tools, menu links, and content types each user role
        can see and manage. Hidden links are also blocked at the route level, so a
        role cannot reach them by typing the URL directly.
      </p>

      <div className="mt-7">
        <ToolsPermissionMatrix data={data} />
      </div>
    </div>
  );
}

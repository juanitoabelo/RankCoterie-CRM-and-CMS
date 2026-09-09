import { notFound } from "next/navigation";
import { getUser } from "../../actions";
import EditUserForm from "./edit-user-form";

export const revalidate = 0;

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const raw = await getUser(id);
  if (!raw) notFound();

  const user = {
    ...raw,
    socialMedia: raw.socialMedia as Record<string, string | null> | null,
  } as React.ComponentProps<typeof EditUserForm>["user"];

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Users / <span className="text-zinc-700">Edit User</span>
      </p>
      <EditUserForm user={user} />
    </div>
  );
}

import { getAllRoles } from "../actions";
import AddUserForm from "./add-user-form";

export const revalidate = 0;

export default async function AddUserPage() {
  const roles = await getAllRoles();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Users / <span className="text-zinc-700">Add New User</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add User</h1>

      <AddUserForm roles={roles} />
    </div>
  );
}

/**
 * Admin Users Page
 * 
 * Uses the Users module for all user-related functionality.
 */
import Link from "next/link";
import { getUsers, UserSearch, UserTable, Pagination } from "@/modules/users";
import { listUsers, getAllRoles } from "@/modules/users/actions";

export const revalidate = 0;

export default async function UsersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; department?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const department = params.department ?? "All";
  const page = parseInt(params.page ?? "1", 10) || 1;
  
  const { users, total, totalPages } = await getUsers({
    search,
    department,
    page,
  });
  
  // Keep original action imports for backward compatibility
  const roles = await getAllRoles();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Users</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Users</h1>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <UserSearch department={department} />
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Results</h2>
        <UserTable users={users} />
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={total}
        search={search}
        department={department}
      />
    </div>
  );
}

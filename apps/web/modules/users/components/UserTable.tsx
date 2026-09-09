/**
 * Users Module — Table Component
 * 
 * Table displaying users.
 */
import Link from "next/link";
import type { UserWithRoles } from "../types";

interface UserTableProps {
  users: UserWithRoles[];
}

export function UserTable({ users }: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs font-medium uppercase text-zinc-500">
              <th className="pb-2 pr-4">Edit User</th>
              <th className="pb-2 pr-4">User Name</th>
              <th className="pb-2 pr-4">Department</th>
              <th className="pb-2 pr-4">User Page</th>
              <th className="pb-2 pr-4">User Articles</th>
              <th className="pb-2 pr-4">Staff Page?</th>
              <th className="pb-2 text-right">ID#</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="py-6 text-center text-sm text-zinc-400">
                No users found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs font-medium uppercase text-zinc-500">
            <th className="pb-2 pr-4">Edit User</th>
            <th className="pb-2 pr-4">User Name</th>
            <th className="pb-2 pr-4">Department</th>
            <th className="pb-2 pr-4">User Page</th>
            <th className="pb-2 pr-4">User Articles</th>
            <th className="pb-2 pr-4">Staff Page?</th>
            <th className="pb-2 text-right">ID#</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-zinc-100 last:border-0">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  {u.imageUrl ? (
                    <img
                      src={u.imageUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600">
                      {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                    </div>
                  )}
                  <Link
                    href={`/admin/users/${u.id}/edit`}
                    className="text-xs text-amber-700 hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </td>
              <td className="py-3 pr-4 text-sm font-medium text-zinc-900">
                {u.firstName || u.lastName
                  ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                  : u.email}
              </td>
              <td className="py-3 pr-4 text-sm text-zinc-600">
                {u.department ?? "—"}
              </td>
              <td className="py-3 pr-4">
                {u.authorUrl ? (
                  <a
                    href={u.authorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Profile ↗
                  </a>
                ) : (
                  <span className="text-xs text-zinc-400">—</span>
                )}
              </td>
              <td className="py-3 pr-4">
                <span className="text-xs text-zinc-400">—</span>
              </td>
              <td className="py-3 pr-4 text-sm text-zinc-600">
                {u.includeInStaffPages ? "Yes" : "No"}
              </td>
              <td className="py-3 text-right text-sm text-zinc-500">
                {u.id.slice(-4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

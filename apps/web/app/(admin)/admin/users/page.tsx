import { ALL_ROLES, createUserForm, listUsers } from "./actions";

export const revalidate = 0;

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  EDITOR: "Editor",
  MARKETING: "Marketing",
  REVIEWER: "Reviewer",
  SALES_REP: "Sales Rep",
  GRACE_COACH: "Grace Coach",
};

export default async function UsersAdminPage() {
  const users = await listUsers();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Users</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Users</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Manage admin accounts and their roles. Only a Super Admin can manage users.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Add user</h2>
          <form action={createUserForm} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600">
                First name
                <input
                  name="firstName"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                Last name
                <input
                  name="lastName"
                  className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-xs font-medium text-zinc-600">
              Email
              <input
                type="email"
                name="email"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-600">
              Password (min 8 chars)
              <input
                type="password"
                name="password"
                required
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <RolesSelect />
            <div className="flex justify-end border-t border-zinc-100 pt-3">
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Create user
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900">Existing users ({users.length})</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {u.firstName || u.lastName
                      ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim()
                      : u.email}
                    {!u.active && (
                      <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                        Inactive
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{u.email}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {u.roles.map((r) => ROLE_LABELS[r.role] ?? r.role).join(", ") || "—"}
                  </p>
                </div>
              </li>
            ))}
            {users.length === 0 && (
              <li className="py-3 text-sm text-zinc-400">No users yet. Add your first above.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RolesSelect() {
  return (
    <fieldset>
      <legend className="block text-xs font-medium text-zinc-600">Roles</legend>
      <div className="mt-1 grid grid-cols-2 gap-1.5">
        {ALL_ROLES.map((r) => (
          <label
            key={r}
            className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700"
          >
            <input type="checkbox" name="roles" value={r} className="accent-zinc-900" />
            {ROLE_LABELS[r] ?? r}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

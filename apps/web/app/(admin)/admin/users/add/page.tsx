import { createUserForm, getAllRoles } from "../actions";

export const revalidate = 0;

export default async function AddUserPage() {
  const roles = await getAllRoles();

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    EDITOR: "Editor",
    MARKETING: "Marketing",
    REVIEWER: "Reviewer",
    SALES_REP: "Sales Rep",
    GRACE_COACH: "Grace Coach",
  };

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / Users / <span className="text-zinc-700">Add New User</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Add User</h1>

      <form action={createUserForm} className="mt-8 max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            First Name
            <input
              name="firstName"
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Last Name
            <input
              name="lastName"
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Email Address
            <input
              type="email"
              name="email"
              required
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Password
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-zinc-600">
            Company
            <select
              name="company"
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">-- Select --</option>
              <option value="Soulegria">Soulegria</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-zinc-600">
            Department
            <select
              name="department"
              className="mt-1 block w-full rounded border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">-- Select --</option>
              <option value="Administrators">Administrators</option>
              <option value="Editors">Editors</option>
              <option value="Marketing">Marketing</option>
              <option value="Sales">Sales</option>
              <option value="Support">Support</option>
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="block text-xs font-medium text-zinc-600">Roles</legend>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {roles.map((r) => (
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

        <div className="flex justify-end border-t border-zinc-100 pt-4">
          <button
            type="submit"
            className="rounded bg-amber-600 px-5 py-2 text-xs font-bold uppercase text-white hover:bg-amber-700"
          >
            Save New User
          </button>
        </div>
      </form>
    </div>
  );
}

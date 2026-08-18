import { adminLogin, adminLogout } from "./actions";

export default function AdminLoginPage() {
  const configured = !!process.env.ADMIN_SECRET;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Admin login</h1>
      {!configured ? (
        <p className="mt-3 text-sm text-amber-700">
          ADMIN_SECRET is not set — admin is disabled. Set it in{" "}
          <code className="rounded bg-zinc-100 px-1">apps/web/.env.local</code>.
        </p>
      ) : (
        <form action={adminLogin} className="mt-4 space-y-3">
          <div>
            <label htmlFor="secret" className="block text-sm font-medium text-zinc-800">
              Admin secret
            </label>
            <input
              id="secret"
              name="secret"
              type="password"
              required
              autoFocus
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Sign in
          </button>
        </form>
      )}
      <form action={adminLogout} className="mt-4">
        <button type="submit" className="text-xs text-zinc-500 underline underline-offset-2">
          Sign out
        </button>
      </form>
    </div>
  );
}
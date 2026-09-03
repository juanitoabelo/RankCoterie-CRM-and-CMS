import { adminLogin } from "./actions";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Admin login</h1>
      <p className="mt-1 text-sm text-zinc-500">Sign in with your admin account.</p>
      <form action={adminLogin} className="mt-4 space-y-3">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-800">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-800">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
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
    </div>
  );
}

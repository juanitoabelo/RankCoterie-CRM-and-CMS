"use client";

import { useState } from "react";

type LoginCardProps = {
  title: string;
  subtitle: string;
  /** Server action that reads email/username/password from FormData. */
  action: (formData: FormData) => Promise<void>;
  /** Shown under the form (links to the other portals, etc.). */
  help: React.ReactNode;
  /** Server-provided error (e.g. from ?error= query param). */
  serverError?: string | null;
};

export default function LoginCard({
  title,
  subtitle,
  action,
  help,
  serverError,
}: LoginCardProps) {
  const [pending, setPending] = useState(false);

  return (
    <div className="mx-auto mt-16 max-w-sm">
      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>

        {serverError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {serverError}
          </p>
        )}

        <form
          action={action}
          onSubmit={() => setPending(true)}
          aria-busy={pending}
          className="mt-6 space-y-4"
        >
          <label className="block text-sm font-medium text-zinc-700">
            Email or username
            <input
              name="email"
              type="text"
              required
              autoComplete="username"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-wait disabled:opacity-70"
          >
            {pending && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-100 pt-4 text-sm text-zinc-500">{help}</div>
      </div>
    </div>
  );
}

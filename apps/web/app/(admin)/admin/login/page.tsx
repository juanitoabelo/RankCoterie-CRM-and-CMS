import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Admin login</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Sign in with your email or username.
      </p>
      <LoginForm error={error ?? null} />
    </div>
  );
}

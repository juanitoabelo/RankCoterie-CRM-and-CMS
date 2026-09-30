import { LoginForm } from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold text-zinc-900">Admin login</h1>
      <p className="mt-1 text-sm text-zinc-500">Sign in with your admin account.</p>
      <LoginForm />
    </div>
  );
}

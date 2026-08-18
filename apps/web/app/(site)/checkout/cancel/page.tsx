import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-2xl font-semibold text-zinc-900">Payment cancelled</h1>
      <p className="mt-3 text-zinc-600">
        No charge was made. You can come back any time to finish your application.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/apply"
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Back to apply
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-400"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
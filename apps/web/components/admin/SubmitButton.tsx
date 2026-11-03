"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that reflects `useFormStatus` — disables and shows a spinner
 * while the server action / form POST is in flight, so the user always knows
 * the dashboard is still processing.
 */
export default function SubmitButton({
  children,
  pendingText = "Working…",
  className = "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60",
  spinnerClassName = "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent",
  ...props
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  spinnerClassName?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={className}
      {...props}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className={spinnerClassName} aria-hidden="true" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDefaultProductTemplateAction } from "./actions";

export default function SetDefaultTemplateButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await setDefaultProductTemplateAction(id);
            if (result.ok) router.refresh();
            else setError(result.error);
          });
        }}
        className="text-sm text-blue-700 hover:underline disabled:opacity-50"
      >
        {pending ? "Setting…" : "Set default"}
      </button>
      {error && <span role="alert" className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}

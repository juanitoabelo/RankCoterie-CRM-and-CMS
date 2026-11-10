"use client";

import { useCallback, useState, useTransition } from "react";
import { saveCustomFieldValues } from "@/app/(admin)/admin/custom-fields/actions";
import type { ContentType } from "@/modules/custom-fields/types";
import CustomFieldsEditor from "./CustomFieldsEditor";

export default function CustomFieldsPanel({
  contentType,
  recordId,
}: {
  contentType: ContentType;
  recordId: string;
}) {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const onLoaded = useCallback((hasFields: boolean) => setMounted(hasFields), []);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const values = String(formData.get("customFieldValues") ?? "{}");
        setMessage("");
        startTransition(async () => {
          try {
            const result = await saveCustomFieldValues(contentType, recordId, values);
            setMessage(result.ok ? "Custom fields saved." : result.error);
          } catch (cause) {
            setMessage(cause instanceof Error ? cause.message : "Could not save custom fields.");
          }
        });
      }}
      className={mounted ? "space-y-3" : "hidden"}
    >
      <CustomFieldsEditor
        contentType={contentType}
        recordId={recordId}
        onLoaded={onLoaded}
      />
      {mounted && (
        <div className="flex items-center gap-3">
          <button disabled={pending} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {pending ? "Saving…" : "Save Custom Fields"}
          </button>
          {message && <p role="status" className={`text-sm ${message.includes("saved") ? "text-emerald-700" : "text-red-700"}`}>{message}</p>}
        </div>
      )}
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { createCrmApiKeyAction, type CreateApiKeyState } from "./actions";

const initialState: CreateApiKeyState = {};

export default function ApiKeyCreateForm() {
  const [state, action, pending] = useActionState(createCrmApiKeyAction, initialState);

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-600">Key name</span>
          <input
            name="name"
            required
            maxLength={80}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            placeholder="Zapier integration"
          />
        </label>
        <fieldset className="text-sm">
          <legend className="text-zinc-600">Scopes</legend>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="scopes" value="crm:read" defaultChecked />
              <span className="text-zinc-700">crm:read</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="scopes" value="crm:write" />
              <span className="text-zinc-700">crm:write</span>
            </label>
          </div>
        </fieldset>
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create key"}
        </button>
      </form>

      {state.token ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-900">
            Copy this token now — it will not be shown again.
          </p>
          <code className="mt-2 block break-all rounded bg-white p-2 text-xs text-zinc-800">
            {state.token}
          </code>
        </div>
      ) : null}
    </div>
  );
}

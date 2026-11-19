"use client";

import { useActionState } from "react";
import { importHubspotCsvAction, type HubspotImportState } from "./actions";

const initialState: HubspotImportState = {};

export default function HubspotImportForm() {
  const [state, action, pending] = useActionState(importHubspotCsvAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">
        <span className="text-zinc-600">Object type</span>
        <select name="type" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm">
          <option value="contacts">Contacts → Leads</option>
          <option value="deals">Deals → Deals</option>
          <option value="engagements">Engagements → Activities</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600">CSV file</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="mt-1 w-full text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {pending ? "Importing…" : "Import CSV"}
      </button>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      {state.result ? (
        <p className="text-xs text-zinc-500">
          Skipped {state.result.skipped} duplicate/invalid rows.
        </p>
      ) : null}
    </form>
  );
}

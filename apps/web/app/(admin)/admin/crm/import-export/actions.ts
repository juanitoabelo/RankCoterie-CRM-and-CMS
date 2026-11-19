"use server";

import { importHubspotCsv, type HubspotImportResult } from "@/modules/crm/hubspot-io";

export type HubspotImportState = {
  error?: string;
  message?: string;
  result?: HubspotImportResult;
};

export async function importHubspotCsvAction(
  _previous: HubspotImportState,
  formData: FormData,
): Promise<HubspotImportState> {
  const type = String(formData.get("type") ?? "contacts");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a CSV file." };
  }
  try {
    const csv = await file.text();
    const result = await importHubspotCsv(type, csv);
    if (!result.ok) return { error: result.error };
    return { message: result.message, result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Import failed." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createCrmApiKey, revokeCrmApiKey } from "@/modules/api/keys";

export type CreateApiKeyState = {
  error?: string;
  token?: string;
  name?: string;
};

export async function createCrmApiKeyAction(
  _previous: CreateApiKeyState,
  formData: FormData,
): Promise<CreateApiKeyState> {
  const name = String(formData.get("name") ?? "");
  const scopes = formData.getAll("scopes").map(String);
  try {
    const result = await createCrmApiKey(name, scopes);
    if (!result.ok) return { error: result.error };
    if (!("token" in result)) return { error: "Could not create API key." };
    return { token: result.token, name };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create API key." };
  }
}

export async function revokeCrmApiKeyAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  await revokeCrmApiKey(id);
  revalidatePath("/admin/crm/api-keys");
}

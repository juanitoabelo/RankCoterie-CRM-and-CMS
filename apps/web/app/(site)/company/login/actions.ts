"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/modules/auth";
import { authenticatePortalUser, startPortalSession } from "@/lib/auth/login";

/** Company owner portal login — subscribers who own a company landing page. */
export async function companyLogin(formData: FormData): Promise<void> {
  const identifier = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await authenticatePortalUser(identifier, password);
  if (!result.ok) {
    redirect(`/company/login?error=${encodeURIComponent(result.error)}`);
  }
  await startPortalSession(result.user.id);
  redirect("/company");
}

export async function companyLogout(): Promise<void> {
  await destroySession();
  redirect("/company/login");
}

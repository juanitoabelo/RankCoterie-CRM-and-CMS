"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/modules/auth";
import { authenticatePortalUser, startPortalSession } from "@/lib/auth/login";

/**
 * Directory listing owner login — after success the owner manages their
 * listing at /admin/my-listing (the existing subscriber area).
 */
export async function listingLogin(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await authenticatePortalUser(email, password);
  if (!result.ok) {
    redirect(`/listing/login?error=${encodeURIComponent(result.error)}`);
  }
  await startPortalSession(result.user.id);
  redirect("/admin/my-listing");
}

export async function listingLogout(): Promise<void> {
  await destroySession();
  redirect("/listing/login");
}

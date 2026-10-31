"use server";

import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { destroySession } from "@/modules/auth";
import { authenticatePortalUser, startPortalSession } from "@/lib/auth/login";
import { ensureSuperAdmin } from "@/lib/bootstrap";

export async function adminLogin(formData: FormData): Promise<void> {
  const identifier = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  await ensureSuperAdmin();

  const result = await authenticatePortalUser(identifier, password);
  if (!result.ok) {
    redirect(`/admin/login?error=${encodeURIComponent(result.error)}`);
  }
  const user = result.user;

  await startPortalSession(user.id);
  // Subscribers (directory owners) land on the owner area; staff go to /admin.
  // Company owners manage pages via the /company/login portal.
  if (user.roles.length === 1 && user.roles[0].role === Role.SUBSCRIBER) {
    redirect("/admin/my-listing");
  }
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, signAdminToken } from "@/lib/admin-auth";

export async function adminLogin(formData: FormData): Promise<void> {
  const secret = process.env.ADMIN_SECRET ?? "";
  const supplied = String(formData.get("secret") ?? "");

  if (!secret || supplied !== secret) {
    throw new Error("Invalid admin secret.");
  }

  (await cookies()).set(ADMIN_COOKIE, signAdminToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h session
  });
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
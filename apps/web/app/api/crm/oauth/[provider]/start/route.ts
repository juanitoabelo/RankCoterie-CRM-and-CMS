import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { canAccessAnySectionForUser, getApiUser } from "@/modules/auth";
import {
  isOAuthProvider,
  oauthAuthorizationUrl,
  oauthMissingEnv,
  oauthProviderConfigured,
  oauthRedirectUri,
} from "@/modules/crm/oauth-providers";
import { signOAuthState } from "@/modules/crm/oauth-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const settingsUrl = new URL("/admin/crm/settings", request.url);

  if (!isOAuthProvider(provider)) {
    return NextResponse.json({ error: "Unknown mail provider." }, { status: 404 });
  }
  const user = await getApiUser();
  if (!user || !(await canAccessAnySectionForUser(user, ["crm"]))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!oauthProviderConfigured(provider)) {
    settingsUrl.searchParams.set(
      "error",
      `Missing OAuth configuration: ${oauthMissingEnv(provider).join(", ")}.`,
    );
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri = oauthRedirectUri(provider, request.url);
  const state = signOAuthState({ provider, userId: user.id });
  (await cookies()).set("crm_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(oauthAuthorizationUrl(provider, redirectUri, state));
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma, TENANT_ID } from "@/modules/shared";
import { canAccessAnySectionForUser, getApiUser } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { encryptToken, verifyOAuthState } from "@/modules/crm/oauth-crypto";
import {
  exchangeOAuthCode,
  fetchOAuthProfile,
  isOAuthProvider,
  oauthMissingEnv,
  oauthProviderConfigured,
  oauthRedirectUri,
} from "@/modules/crm/oauth-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, key: "ok" | "error", message: string) {
  const url = new URL("/admin/crm/settings/integrations", request.url);
  url.searchParams.set(key, message);
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!isOAuthProvider(provider)) {
    return NextResponse.json({ error: "Unknown mail provider." }, { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const cookieStore = await cookies();
  const cookieState = cookieStore.get("crm_oauth_state")?.value;
  cookieStore.delete("crm_oauth_state");

  if (providerError) {
    return settingsRedirect(request, "error", `Mail provider returned: ${providerError}`);
  }
  if (!code) {
    return settingsRedirect(request, "error", "Mail provider did not return an authorization code.");
  }
  if (!cookieState || cookieState !== url.searchParams.get("state")) {
    return settingsRedirect(request, "error", "OAuth state check failed. Start the connection again.");
  }
  const state = verifyOAuthState(cookieState);
  if (!state || state.provider !== provider) {
    return settingsRedirect(request, "error", "OAuth state expired. Start the connection again.");
  }
  const user = await getApiUser();
  if (
    !user ||
    user.id !== state.userId ||
    !(await canAccessAnySectionForUser(user, ["crm"]))
  ) {
    return settingsRedirect(request, "error", "Sign in again before connecting a mailbox.");
  }
  if (!(await oauthProviderConfigured(provider))) {
    return settingsRedirect(
      request,
      "error",
      `Missing OAuth configuration: ${(await oauthMissingEnv(provider)).join(", ")}.`,
    );
  }

  try {
    const tokens = await exchangeOAuthCode(
      provider,
      code,
      await oauthRedirectUri(provider, request.url),
    );
    const profile = await fetchOAuthProfile(provider, tokens.accessToken);
    const existing = await prisma.crmEmailConnection.findUnique({
      where: {
        tenantId_userId_provider: { tenantId: TENANT_ID, userId: user.id, provider },
      },
    });
    const connection = await prisma.crmEmailConnection.upsert({
      where: {
        tenantId_userId_provider: { tenantId: TENANT_ID, userId: user.id, provider },
      },
      create: {
        tenantId: TENANT_ID,
        userId: user.id,
        provider,
        email: profile.email,
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
        expiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? null,
        syncCursor: new Date(Date.now() - 7 * 86_400_000),
        active: true,
      },
      update: {
        email: profile.email,
        accessToken: encryptToken(tokens.accessToken),
        refreshToken: tokens.refreshToken
          ? encryptToken(tokens.refreshToken)
          : existing?.refreshToken ?? null,
        expiresAt: tokens.expiresAt ?? null,
        scope: tokens.scope ?? null,
        active: true,
        lastSyncError: null,
      },
    });

    await logAudit({
      action: "CRM_EMAIL_CONNECT",
      entity: "CrmEmailConnection",
      entityId: connection.id,
      actorId: user.id,
      reason: `Connected ${provider} mailbox ${profile.email}`,
      meta: { provider, email: profile.email },
    }).catch(() => null);

    return settingsRedirect(request, "ok", `${provider} mailbox connected.`);
  } catch (error) {
    reportCrmIssue("error", "crm.oauth.callback", error, { provider, userId: user.id });
    return settingsRedirect(
      request,
      "error",
      error instanceof Error ? error.message : "Could not connect the mailbox.",
    );
  }
}

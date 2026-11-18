import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { reportCrmIssue } from "@/lib/monitoring";
import { logCrmActivity } from "./activity";
import { decryptToken, encryptToken } from "./oauth-crypto";
import {
  fetchOAuthActivities,
  isOAuthProvider,
  oauthProviderLabel,
  refreshOAuthToken,
  type OAuthActivity,
} from "./oauth-providers";

export type CrmEmailConnectionPublic = {
  id: string;
  provider: string;
  email: string;
  active: boolean;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
};

export type CrmSyncSummary = {
  connectionId: string;
  provider: string;
  email: string;
  imported: number;
  skipped: number;
  unmatched: number;
  error?: string;
};

export async function getCrmEmailConnections(userId?: string): Promise<CrmEmailConnectionPublic[]> {
  return prisma.crmEmailConnection.findMany({
    where: { tenantId: TENANT_ID, ...(userId ? { userId } : {}) },
    select: {
      id: true,
      provider: true,
      email: true,
      active: true,
      lastSyncAt: true,
      lastSyncError: true,
    },
    orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
  });
}

async function connectionAccessToken(connection: {
  id: string;
  provider: string;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
}): Promise<string> {
  if (!isOAuthProvider(connection.provider)) {
    throw new Error(`Unsupported mail provider "${connection.provider}".`);
  }
  const expiresSoon =
    connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 2 * 60 * 1000;
  if (!expiresSoon) return decryptToken(connection.accessToken);

  if (!connection.refreshToken) {
    throw new Error("The provider token expired and no refresh token is stored.");
  }
  const refreshed = await refreshOAuthToken(
    connection.provider,
    decryptToken(connection.refreshToken),
  );
  await prisma.crmEmailConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: encryptToken(refreshed.accessToken),
      refreshToken: refreshed.refreshToken
        ? encryptToken(refreshed.refreshToken)
        : connection.refreshToken,
      expiresAt: refreshed.expiresAt ?? null,
      scope: refreshed.scope ?? undefined,
    },
  });
  return refreshed.accessToken;
}

async function resolveActivityLinks(addresses: string[]) {
  const emails = [...new Set(addresses.map((email) => email.toLowerCase()).filter(Boolean))].slice(
    0,
    25,
  );
  if (emails.length === 0) return null;

  const [lead, client] = await Promise.all([
    prisma.lead.findFirst({
      where: { tenantId: TENANT_ID, email: { in: emails, mode: "insensitive" } },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.client.findFirst({
      where: { tenantId: TENANT_ID, email: { in: emails, mode: "insensitive" } },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  if (!lead && !client) return null;

  const deal = await prisma.deal.findFirst({
    where: {
      tenantId: TENANT_ID,
      closedAt: null,
      ...(client ? { clientId: client.id } : { leadId: lead?.id }),
    },
    select: { id: true },
    orderBy: [{ updatedAt: "desc" }],
  });

  return {
    leadId: lead?.id ?? null,
    clientId: client?.id ?? null,
    dealId: deal?.id ?? null,
  };
}

async function importActivity(
  activity: OAuthActivity,
  source: string,
): Promise<"imported" | "skipped" | "unmatched"> {
  const links = await resolveActivityLinks(activity.addresses);
  if (!links) return "unmatched";
  try {
    await logCrmActivity({
      type: activity.type,
      subject: activity.subject,
      body: activity.body.slice(0, 5000),
      occurredAt: activity.occurredAt,
      leadId: links.leadId,
      clientId: links.clientId,
      dealId: links.dealId,
      externalId: activity.externalId,
      source,
      metadata: {
        provider: source,
        webLink: activity.webLink ?? null,
        importedAt: new Date().toISOString(),
      },
    });
    return "imported";
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "skipped";
    }
    throw error;
  }
}

export async function syncCrmEmailConnection(
  connectionId: string,
  options: { force?: boolean } = {},
): Promise<CrmSyncSummary> {
  const connection = await prisma.crmEmailConnection.findFirst({
    where: { id: connectionId, tenantId: TENANT_ID, active: true },
  });
  if (!connection) throw new Error("Mail connection not found.");
  if (!isOAuthProvider(connection.provider)) {
    throw new Error(`Unsupported mail provider "${connection.provider}".`);
  }

  const startedAt = new Date();
  const summary: CrmSyncSummary = {
    connectionId: connection.id,
    provider: connection.provider,
    email: connection.email,
    imported: 0,
    skipped: 0,
    unmatched: 0,
  };

  try {
    if (
      !options.force &&
      connection.lastSyncAt &&
      Date.now() - connection.lastSyncAt.getTime() < 10 * 60 * 1000
    ) {
      return summary;
    }

    const accessToken = await connectionAccessToken(connection);
    const activities = await fetchOAuthActivities(
      connection.provider,
      accessToken,
      connection.syncCursor,
    );
    for (const activity of activities) {
      const result = await importActivity(activity, connection.provider);
      summary[result] += 1;
    }

    await prisma.crmEmailConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: startedAt,
        syncCursor: new Date(startedAt.getTime() - 60_000),
        lastSyncError: null,
      },
    });
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    await prisma.crmEmailConnection
      .update({
        where: { id: connection.id },
        data: { lastSyncError: summary.error.slice(0, 1000) },
      })
      .catch(() => null);
    reportCrmIssue("error", "crm.oauth.sync", error, {
      connectionId: connection.id,
      provider: connection.provider,
      email: connection.email,
    });
  }

  return summary;
}

export async function syncAllCrmEmailConnections(options: {
  force?: boolean;
} = {}): Promise<CrmSyncSummary[]> {
  const connections = await prisma.crmEmailConnection.findMany({
    where: { tenantId: TENANT_ID, active: true },
    select: { id: true },
    orderBy: [{ lastSyncAt: "asc" }],
  });
  const results: CrmSyncSummary[] = [];
  for (const connection of connections) {
    results.push(await syncCrmEmailConnection(connection.id, options));
  }
  return results;
}

export async function syncUserCrmEmailConnections(userId: string): Promise<CrmSyncSummary[]> {
  const connections = await prisma.crmEmailConnection.findMany({
    where: { tenantId: TENANT_ID, userId, active: true },
    select: { id: true },
    orderBy: [{ provider: "asc" }],
  });
  const results: CrmSyncSummary[] = [];
  for (const connection of connections) {
    results.push(await syncCrmEmailConnection(connection.id, { force: true }));
  }
  return results;
}

export function connectionProviderLabel(provider: string): string {
  return isOAuthProvider(provider) ? oauthProviderLabel(provider) : provider;
}

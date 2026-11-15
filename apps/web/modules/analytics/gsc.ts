import { createSign } from "node:crypto";
import { prisma, TENANT_ID } from "@/modules/shared";
import { getAnalyticsSettingsRecord, resolveAnalyticsSecret } from "./settings";
import { addDays, dayKey, startOfUtcDay } from "./range";
import type { SyncResult } from "./types";

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type GscResponse = {
  rows?: GscRow[];
  error?: { message?: string };
};

function base64url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(email: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  const signature = signer
    .sign(privateKey)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const assertion = `${signingInput}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description ?? `Google token request failed (${response.status})`);
  }
  return json.access_token;
}

function pagePath(page: string): string {
  try {
    return new URL(page).pathname || "/";
  } catch {
    return page.slice(0, 500);
  }
}

export async function syncGsc(days = 7): Promise<SyncResult> {
  const settings = await getAnalyticsSettingsRecord();
  if (!settings.gscSiteUrl) {
    return { ok: false, skipped: true, message: "Add a Search Console property URL in Analytics Settings." };
  }
  const email = resolveAnalyticsSecret(
    settings.googleServiceAccountEmail,
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  );
  const privateKey = resolveAnalyticsSecret(
    settings.googleServiceAccountPrivateKey,
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  )?.replace(/\\n/g, "\n");
  if (!email || !privateKey) {
    return {
      ok: false,
      skipped: true,
      message: "Add the service account email and private key in Analytics Settings or set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.",
    };
  }

  const now = new Date();
  const end = startOfUtcDay(addDays(now, -1));
  const start = startOfUtcDay(addDays(end, -(Math.max(1, days) - 1)));
  const startDate = dayKey(start);
  const endDate = dayKey(end);

  await prisma.analyticsSyncState.upsert({
    where: { tenantId_kind: { tenantId: TENANT_ID, kind: "gsc" } },
    update: { lastRunAt: now },
    create: { tenantId: TENANT_ID, kind: "gsc", lastRunAt: now },
  });

  try {
    const token = await getAccessToken(email, privateKey);
    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(settings.gscSiteUrl)}/searchAnalytics/query`;

    const rows: GscRow[] = [];
    let startRow = 0;
    for (let page = 0; page < 5; page += 1) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["date", "query", "page", "country", "device"],
          rowLimit: 25000,
          startRow,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as GscResponse;
      if (!response.ok) {
        throw new Error(json.error?.message ?? `Search Console request failed (${response.status})`);
      }
      const batch = json.rows ?? [];
      rows.push(...batch);
      if (batch.length < 25000) break;
      startRow += batch.length;
    }

    const data = rows
      .map((row) => {
        const keys = row.keys ?? [];
        const date = keys[0];
        const query = keys[1]?.trim();
        if (!date || !query) return null;
        return {
          tenantId: TENANT_ID,
          date: new Date(`${date}T00:00:00Z`),
          source: "gsc",
          query: query.slice(0, 500),
          page: pagePath(keys[2] ?? ""),
          country: (keys[3] ?? "").slice(0, 10),
          device: (keys[4] ?? "").slice(0, 20),
          impressions: Math.max(0, Math.round(row.impressions ?? 0)),
          clicks: Math.max(0, Math.round(row.clicks ?? 0)),
          ctr: Number(row.ctr ?? 0),
          position: Number(row.position ?? 0),
          resultsCount: 0,
          zeroResults: 0,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    await prisma.$transaction(async (tx) => {
      await tx.analyticsSearchDaily.deleteMany({
        where: {
          tenantId: TENANT_ID,
          source: "gsc",
          date: { gte: start, lt: addDays(end, 1) },
        },
      });
      if (data.length > 0) {
        await tx.analyticsSearchDaily.createMany({ data, skipDuplicates: true });
      }
    });

    await prisma.analyticsSyncState.upsert({
      where: { tenantId_kind: { tenantId: TENANT_ID, kind: "gsc" } },
      update: { lastSuccessAt: new Date(), lastError: null, cursor: endDate },
      create: {
        tenantId: TENANT_ID,
        kind: "gsc",
        lastSuccessAt: new Date(),
        cursor: endDate,
      },
    });

    return { ok: true, message: `Imported ${data.length} Search Console rows (${startDate} → ${endDate}).`, rows: data.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search Console sync failed.";
    await prisma.analyticsSyncState.upsert({
      where: { tenantId_kind: { tenantId: TENANT_ID, kind: "gsc" } },
      update: { lastError: message },
      create: { tenantId: TENANT_ID, kind: "gsc", lastError: message },
    });
    return { ok: false, message };
  }
}

import { prisma, TENANT_ID } from "@/modules/shared";
import { getAnalyticsSettingsRecord, resolveAnalyticsSecret } from "./settings";
import { dayKey, startOfUtcDay } from "./range";
import { parseStringArray } from "@/lib/analytics/privacy";
import type { SyncResult } from "./types";

type DataForSeoItem = {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  url?: string;
};

type DataForSeoTask = {
  status_code?: number;
  status_message?: string;
  result?: Array<{ items?: DataForSeoItem[] }>;
};

type DataForSeoResponse = {
  tasks?: DataForSeoTask[];
};

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

export async function syncCompetitorRankings(): Promise<SyncResult> {
  const settings = await getAnalyticsSettingsRecord();
  const competitors = parseStringArray(settings.competitorDomains).map(normalizeDomain).filter(Boolean);
  const keywords = parseStringArray(settings.targetKeywords).slice(0, 10);

  if (competitors.length === 0 || keywords.length === 0) {
    return {
      ok: false,
      skipped: true,
      message: "Add competitor domains and target keywords in Analytics Settings.",
    };
  }

  const login = resolveAnalyticsSecret(settings.dataForSeoLogin, process.env.DATAFORSEO_LOGIN);
  const password = resolveAnalyticsSecret(settings.dataForSeoPassword, process.env.DATAFORSEO_PASSWORD);
  if (!login || !password) {
    return {
      ok: false,
      skipped: true,
      message: "Add DataForSEO credentials in Analytics Settings or set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
    };
  }

  const now = new Date();
  const date = startOfUtcDay(now);
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  await prisma.analyticsSyncState.upsert({
    where: { tenantId_kind: { tenantId: TENANT_ID, kind: "dataforseo" } },
    update: { lastRunAt: now },
    create: { tenantId: TENANT_ID, kind: "dataforseo", lastRunAt: now },
  });

  try {
    const rows: Array<{
      tenantId: string;
      date: Date;
      competitorDomain: string;
      keyword: string;
      position: number | null;
      url: string | null;
      country: string;
      device: string;
      source: string;
    }> = [];

    for (const keyword of keywords) {
      const response = await fetch(
        "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
        {
          method: "POST",
          headers: {
            authorization: `Basic ${auth}`,
            "content-type": "application/json",
          },
          body: JSON.stringify([
            {
              keyword,
              location_code: 2840,
              language_code: "en",
              depth: 100,
            },
          ]),
        },
      );
      const json = (await response.json().catch(() => ({}))) as DataForSeoResponse;
      const task = json.tasks?.[0];
      if (!response.ok || (task?.status_code ?? 20000) >= 40000) {
        throw new Error(task?.status_message ?? `DataForSEO request failed (${response.status})`);
      }
      const items = task?.result?.[0]?.items ?? [];
      for (const item of items) {
        if (item.type !== "organic" || !item.domain) continue;
        const domain = normalizeDomain(item.domain);
        if (!competitors.includes(domain)) continue;
        rows.push({
          tenantId: TENANT_ID,
          date,
          competitorDomain: domain,
          keyword,
          position: item.rank_absolute ?? item.rank_group ?? null,
          url: item.url?.slice(0, 1000) ?? null,
          country: "US",
          device: "desktop",
          source: "dataforseo",
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.competitorRankingDaily.deleteMany({
        where: { tenantId: TENANT_ID, date, source: "dataforseo" },
      });
      if (rows.length > 0) {
        await tx.competitorRankingDaily.createMany({ data: rows, skipDuplicates: true });
      }
    });

    await prisma.analyticsSyncState.upsert({
      where: { tenantId_kind: { tenantId: TENANT_ID, kind: "dataforseo" } },
      update: { lastSuccessAt: new Date(), lastError: null, cursor: dayKey(date) },
      create: {
        tenantId: TENANT_ID,
        kind: "dataforseo",
        lastSuccessAt: new Date(),
        cursor: dayKey(date),
      },
    });

    return {
      ok: true,
      message: `Stored ${rows.length} competitor ranking rows across ${keywords.length} keywords.`,
      rows: rows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Competitor sync failed.";
    await prisma.analyticsSyncState.upsert({
      where: { tenantId_kind: { tenantId: TENANT_ID, kind: "dataforseo" } },
      update: { lastError: message },
      create: { tenantId: TENANT_ID, kind: "dataforseo", lastError: message },
    });
    return { ok: false, message };
  }
}

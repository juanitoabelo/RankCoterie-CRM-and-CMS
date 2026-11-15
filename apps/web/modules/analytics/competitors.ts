import { prisma, TENANT_ID } from "@/modules/shared";
import { getAnalyticsSettingsRecord, resolveAnalyticsSecret } from "./settings";
import { parseCompetitorProvider } from "./constants";
import { dayKey, startOfUtcDay } from "./range";
import { parseStringArray } from "@/lib/analytics/privacy";
import type { SyncResult } from "./types";

type SettingsRecord = Awaited<ReturnType<typeof getAnalyticsSettingsRecord>>;

type CompetitorRowInput = {
  tenantId: string;
  date: Date;
  competitorDomain: string;
  keyword: string;
  position: number | null;
  url: string | null;
  country: string;
  device: string;
  source: string;
};

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

type SearxngResult = {
  url?: string;
  title?: string;
  content?: string;
  engine?: string;
};

type SearxngResponse = {
  results?: SearxngResult[];
  error?: string;
};

const SYNC_KIND = "competitors";

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

function domainFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return normalizeDomain(url.hostname);
  } catch {
    return null;
  }
}

function parseBaseUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function searxngUrl(baseUrl: string, keyword: string): URL {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL("search", base);
  url.searchParams.set("q", keyword);
  url.searchParams.set("format", "json");
  url.searchParams.set("language", "en");
  url.searchParams.set("safesearch", "0");
  return url;
}

async function markSyncStart(provider: string): Promise<Date> {
  const now = new Date();
  await prisma.analyticsSyncState.upsert({
    where: { tenantId_kind: { tenantId: TENANT_ID, kind: SYNC_KIND } },
    update: { lastRunAt: now, cursor: provider },
    create: {
      tenantId: TENANT_ID,
      kind: SYNC_KIND,
      lastRunAt: now,
      cursor: provider,
    },
  });
  return now;
}

async function markSyncSuccess(provider: string, date: Date): Promise<void> {
  await prisma.analyticsSyncState.upsert({
    where: { tenantId_kind: { tenantId: TENANT_ID, kind: SYNC_KIND } },
    update: {
      lastSuccessAt: new Date(),
      lastError: null,
      cursor: `${provider}:${dayKey(date)}`,
    },
    create: {
      tenantId: TENANT_ID,
      kind: SYNC_KIND,
      lastSuccessAt: new Date(),
      cursor: `${provider}:${dayKey(date)}`,
    },
  });
}

async function markSyncError(provider: string, message: string): Promise<void> {
  await prisma.analyticsSyncState.upsert({
    where: { tenantId_kind: { tenantId: TENANT_ID, kind: SYNC_KIND } },
    update: { lastError: message, cursor: provider },
    create: {
      tenantId: TENANT_ID,
      kind: SYNC_KIND,
      lastError: message,
      cursor: provider,
    },
  });
}

async function replaceRows(rows: CompetitorRowInput[], source: string, date: Date): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.competitorRankingDaily.deleteMany({
      where: { tenantId: TENANT_ID, date, source },
    });
    if (rows.length > 0) {
      await tx.competitorRankingDaily.createMany({ data: rows, skipDuplicates: true });
    }
  });
}

async function syncDataForSeo(
  settings: SettingsRecord,
  competitors: string[],
  keywords: string[],
  date: Date,
): Promise<SyncResult> {
  const login = resolveAnalyticsSecret(settings.dataForSeoLogin, process.env.DATAFORSEO_LOGIN);
  const password = resolveAnalyticsSecret(settings.dataForSeoPassword, process.env.DATAFORSEO_PASSWORD);
  if (!login || !password) {
    return {
      ok: false,
      skipped: true,
      message: "Add DataForSEO credentials in Analytics Settings or set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD.",
    };
  }

  await markSyncStart("dataforseo");
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  try {
    const rows: CompetitorRowInput[] = [];

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

    await replaceRows(rows, "dataforseo", date);
    await markSyncSuccess("dataforseo", date);

    return {
      ok: true,
      message: `Stored ${rows.length} competitor ranking rows across ${keywords.length} keywords via DataForSEO.`,
      rows: rows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DataForSEO sync failed.";
    await markSyncError("dataforseo", message);
    return { ok: false, message };
  }
}

async function syncSearxng(
  settings: SettingsRecord,
  competitors: string[],
  keywords: string[],
  date: Date,
): Promise<SyncResult> {
  const baseUrl = resolveAnalyticsSecret(settings.searxngUrl, process.env.SEARXNG_URL);
  if (!baseUrl) {
    return {
      ok: false,
      skipped: true,
      message: "Add a SearXNG URL in Analytics Settings or set SEARXNG_URL.",
    };
  }
  if (!parseBaseUrl(baseUrl)) {
    return {
      ok: false,
      skipped: true,
      message: "The SearXNG URL must be a valid http(s) URL.",
    };
  }

  await markSyncStart("searxng");

  try {
    const rows: CompetitorRowInput[] = [];

    for (const keyword of keywords) {
      const response = await fetch(searxngUrl(baseUrl, keyword), {
        headers: {
          accept: "application/json",
          "user-agent": "RankCoterieAnalytics/1.0",
        },
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await response.json().catch(() => ({}))) as SearxngResponse;
      if (!response.ok) {
        throw new Error(json.error ?? `SearXNG request failed (${response.status})`);
      }
      if (json.error) throw new Error(json.error);

      const results = json.results ?? [];
      for (const competitor of competitors) {
        const index = results.findIndex((result) => domainFromUrl(result.url) === competitor);
        const match = index >= 0 ? results[index] : null;
        rows.push({
          tenantId: TENANT_ID,
          date,
          competitorDomain: competitor,
          keyword,
          position: match ? index + 1 : null,
          url: match?.url?.slice(0, 1000) ?? null,
          country: "",
          device: "",
          source: "searxng",
        });
      }
    }

    await replaceRows(rows, "searxng", date);
    await markSyncSuccess("searxng", date);

    return {
      ok: true,
      message: `Stored ${rows.length} competitor checks across ${keywords.length} keywords via SearXNG.`,
      rows: rows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "SearXNG sync failed.";
    await markSyncError("searxng", message);
    return { ok: false, message };
  }
}

export async function syncCompetitorRankings(): Promise<SyncResult> {
  const settings = await getAnalyticsSettingsRecord();
  const provider = parseCompetitorProvider(settings.competitorProvider);
  const competitors = parseStringArray(settings.competitorDomains).map(normalizeDomain).filter(Boolean);
  const keywords = parseStringArray(settings.targetKeywords).slice(0, 10);

  if (provider === "manual") {
    return {
      ok: true,
      skipped: true,
      message:
        "Manual watchlist is active. Use the competitor page links to check rankings; no external sync was run.",
    };
  }

  if (competitors.length === 0) {
    return {
      ok: false,
      skipped: true,
      message: "Add competitor domains in Analytics Settings.",
    };
  }

  if (keywords.length === 0) {
    return {
      ok: false,
      skipped: true,
      message: "Add target keywords in Analytics Settings.",
    };
  }

  const date = startOfUtcDay(new Date());
  if (provider === "searxng") {
    return syncSearxng(settings, competitors, keywords, date);
  }
  return syncDataForSeo(settings, competitors, keywords, date);
}

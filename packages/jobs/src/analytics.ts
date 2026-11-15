/**
 * Rank Coterie — Inngest jobs: analytics rollups and external syncs.
 */
import { inngest } from "./index";
import { runAnalyticsMaintenance } from "web/modules/analytics/rollups";
import { syncGsc } from "web/modules/analytics/gsc";
import { syncCompetitorRankings } from "web/modules/analytics/competitors";

export const ANALYTICS_ROLLUP_EVENT = "analytics/rollup";
export const ANALYTICS_GSC_SYNC_EVENT = "analytics/gsc.sync";
export const ANALYTICS_COMPETITORS_SYNC_EVENT = "analytics/competitors.sync";

export const analyticsRollupJob = inngest.createFunction(
  {
    id: "analytics-rollup",
    triggers: [
      { event: ANALYTICS_ROLLUP_EVENT },
      { cron: process.env.ANALYTICS_ROLLUP_CRON ?? "*/15 * * * *" },
    ],
  },
  async ({ step }) => {
    const result = await step.run("rollup-analytics", () => runAnalyticsMaintenance());
    return result;
  },
);

export const analyticsGscSyncJob = inngest.createFunction(
  {
    id: "analytics-gsc-sync",
    triggers: [
      { event: ANALYTICS_GSC_SYNC_EVENT },
      { cron: process.env.ANALYTICS_GSC_CRON ?? "15 4 * * *" },
    ],
  },
  async ({ step }) => {
    return step.run("sync-gsc", () => syncGsc(7));
  },
);

export const analyticsCompetitorsSyncJob = inngest.createFunction(
  {
    id: "analytics-competitors-sync",
    triggers: [
      { event: ANALYTICS_COMPETITORS_SYNC_EVENT },
      { cron: process.env.ANALYTICS_COMPETITORS_CRON ?? "30 4 * * *" },
    ],
  },
  async ({ step }) => {
    return step.run("sync-competitors", () => syncCompetitorRankings());
  },
);

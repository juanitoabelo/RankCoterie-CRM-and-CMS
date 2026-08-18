/**
 * Canopy V2 — Inngest job: dunning grace-expiry sweep (legacy §4.6).
 *
 * Runs hourly (DUNNING_CRON env overrides) and on billing/dunning.run events.
 * The webhook marks overdue payments SUSPENDED + grace; this job flips listings
 * whose grace window has passed to EXPIRED (hidden by the visibility gate).
 */
import { inngest } from "./index";
import { dunningSweep } from "web/lib/billing/dunning";

export const DUNNING_RUN_EVENT = "billing/dunning.run";

export const dunningJob = inngest.createFunction(
  {
    id: "dunning",
    triggers: [
      { event: DUNNING_RUN_EVENT },
      { cron: process.env.DUNNING_CRON ?? "0 * * * *" },
    ],
  },
  async ({ step }) => {
    const result = await step.run("dunning-sweep", () => dunningSweep());
    return result;
  },
);
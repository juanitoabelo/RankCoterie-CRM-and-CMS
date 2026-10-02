/**
 * Canopy V2 — Inngest job: abandoned pending-order sweep.
 *
 * Runs every 5 minutes (ABANDONED_CRON env overrides) and on
 * orders/abandoned.run. Cancels PENDING orders whose payment never arrived
 * within ABANDONED_ORDER_MINUTES (default 60) and releases their reserved
 * stock + coupon usage, so abandoned checkouts don't hold inventory forever.
 */
import { inngest } from "./index";
import { releaseAbandonedOrders } from "web/lib/billing/pending-orders";

export const ABANDONED_RUN_EVENT = "orders/abandoned.run";

export const abandonedOrdersJob = inngest.createFunction(
  {
    id: "abandoned-orders",
    triggers: [
      { event: ABANDONED_RUN_EVENT },
      { cron: process.env.ABANDONED_CRON ?? "*/5 * * * *" },
    ],
  },
  async ({ step }) => {
    const result = await step.run("release-abandoned", () => releaseAbandonedOrders());
    return result;
  },
);

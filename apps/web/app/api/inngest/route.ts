import { serve } from "inngest/next";
import { inngest } from "jobs";
import { variantPublishJob } from "jobs/variantPublish";
import { feedSyncAllJob, feedSyncOneJob } from "jobs/feedSync";
import { dunningJob } from "jobs/dunning";
import { invoiceRebillingJob } from "jobs/invoiceRebilling";
import { abandonedOrdersJob } from "jobs/abandonedOrders";
import {
  analyticsCompetitorsSyncJob,
  analyticsGscSyncJob,
  analyticsRollupJob,
} from "jobs/analytics";

export const { GET, POST } = serve({
  client: inngest,
  functions: [
    variantPublishJob,
    feedSyncAllJob,
    feedSyncOneJob,
    dunningJob,
    invoiceRebillingJob,
    abandonedOrdersJob,
    analyticsRollupJob,
    analyticsGscSyncJob,
    analyticsCompetitorsSyncJob,
  ],
});
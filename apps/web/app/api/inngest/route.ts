import { serve } from "inngest/next";
import { inngest } from "jobs";
import { variantPublishJob } from "jobs/variantPublish";
import { feedSyncAllJob, feedSyncOneJob } from "jobs/feedSync";
import { dunningJob } from "jobs/dunning";

export const { GET, POST } = serve({
  client: inngest,
  functions: [variantPublishJob, feedSyncAllJob, feedSyncOneJob, dunningJob],
});
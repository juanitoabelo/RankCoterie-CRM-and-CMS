/**
 * Canopy V2 — Inngest job: materialize content-template variants per region (§6.5b).
 *
 * Fired by the admin content page on "Publish" (event: content/template.publish).
 * Runs the same idempotent publish logic as the inline server action, but async
 * — for large region sets (665 regions × N categories) the job is the path
 * that keeps the request light.
 */
import { inngest } from "./index";
import { publishVariants } from "web/lib/localization/variants";

export const VARIANT_PUBLISH_EVENT = "content/template.publish";

export interface VariantPublishPayload {
  templateId: string;
  regionIds: string[];
}

export const variantPublishJob = inngest.createFunction(
  {
    id: "variant-publish",
    triggers: { event: VARIANT_PUBLISH_EVENT },
  },
  async ({ event, step }) => {
    const { templateId, regionIds } = event.data as VariantPublishPayload;

    const written = await step.run("materialize-variants", () =>
      publishVariants(templateId, regionIds),
    );

    return { templateId, written };
  },
);
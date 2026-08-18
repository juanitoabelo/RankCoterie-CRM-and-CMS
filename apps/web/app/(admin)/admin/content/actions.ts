"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/directory/prismaCatalog";
import {
  previewVariant,
  publishVariants,
  type VariantRegion,
} from "@/lib/localization/variants";
import { inngest } from "jobs";
import { VARIANT_PUBLISH_EVENT } from "jobs/variantPublish";

function toVariantRegion(r: {
  id: string;
  city: string | null;
  state: string;
  stateFull: string;
  slug: string;
}): VariantRegion {
  return {
    id: r.id,
    city: r.city,
    state: r.state,
    stateFull: r.stateFull,
    slug: r.slug,
  };
}

export type PreviewResult = { ok: true; html: string } | { ok: false; error: string };

export async function previewRegion(
  templateId: string,
  regionId: string,
): Promise<PreviewResult> {
  const [template, region] = await Promise.all([
    prisma.contentTemplate.findUnique({ where: { id: templateId } }),
    prisma.region.findUnique({ where: { id: regionId } }),
  ]);
  if (!template || !region) return { ok: false, error: "Template or region not found" };

  return { ok: true, html: previewVariant(template.body, toVariantRegion(region)) };
}

export type PublishResult =
  | { ok: true; mode: "inline" | "queued"; written?: number }
  | { ok: false; error: string };

export async function publishTemplate(
  templateId: string,
  regionIds: string[],
): Promise<PublishResult> {
  if (regionIds.length === 0) return { ok: false, error: "Select at least one region" };

  try {
    // Production path: enqueue the Inngest job (async materialization at scale).
    if (process.env.INNGEST_EVENT_KEY) {
      await inngest.send({
        name: VARIANT_PUBLISH_EVENT,
        data: { templateId, regionIds },
      });
      revalidatePath("/", "layout");
      return { ok: true, mode: "queued" };
    }

    // Dev path (no Inngest configured): run the same logic inline.
    const written = await publishVariants(templateId, regionIds);
    revalidatePath("/", "layout");
    return { ok: true, mode: "inline", written };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Publish failed" };
  }
}
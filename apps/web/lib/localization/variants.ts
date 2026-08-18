/**
 * Canopy V2 — content-template variant preview + publish (§6.5b).
 *
 * Content is authored ONCE (ContentTemplate.body with {{region}} tokens); publishing
 * materializes one ContentVariant per selected region, ready for SSG/ISR.
 * This is the single source of truth for variant logic — used by the admin UI
 * (server actions) and by the Inngest publish job (packages/jobs) alike.
 */
import { prisma } from "@/lib/directory/prismaCatalog";
import { renderLocalizedContent, regionContext } from "./render";

export interface VariantRegion {
  id: string;
  city: string | null;
  state: string;
  stateFull: string;
  slug: string;
}

/** Display name: "Sacramento, CA" for cities, "California" for states. */
export function regionDisplayName(region: VariantRegion): string {
  return region.city ? `${region.city}, ${region.state}` : region.stateFull;
}

/** Render a template body for one region — exactly what the variant will contain. */
export function previewVariant(body: string, region: VariantRegion): string {
  return renderLocalizedContent(body, regionContext(regionDisplayName(region), region.slug));
}

export interface PublishVariantOptions {
  /** Target status (LIVE by default; SCHEDULED implied when publishAt is set). */
  status?: "SCHEDULED" | "LIVE";
  /** Optional per-region scheduling (future §6.5 per-region statuses). */
  publishAt?: Date;
}

/**
 * Materialize ContentVariant rows for a template × regions.
 *
 * Idempotent: unchanged, already-published variants are skipped (no revision bump);
 * changed or missing ones are upserted with a revision increment.
 * Returns the number of variants written.
 */
export async function publishVariants(
  templateId: string,
  regionIds: string[],
  opts: PublishVariantOptions = {},
): Promise<number> {
  const template = await prisma.contentTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error(`ContentTemplate not found: ${templateId}`);

  const regions = await prisma.region.findMany({ where: { id: { in: regionIds } } });
  if (regions.length !== regionIds.length) {
    throw new Error(
      `Region mismatch: ${regionIds.length} requested, ${regions.length} found`,
    );
  }

  const status = opts.publishAt ? "SCHEDULED" : (opts.status ?? "LIVE");
  let written = 0;

  await prisma.$transaction(async (tx) => {
    for (const region of regions) {
      const body = previewVariant(template.body, region);
      const existing = await tx.contentVariant.findUnique({
        where: { templateId_regionId: { templateId, regionId: region.id } },
      });
      if (existing && existing.body === body && existing.status === status) continue;

      await tx.contentVariant.upsert({
        where: { templateId_regionId: { templateId, regionId: region.id } },
        create: {
          templateId,
          regionId: region.id,
          body,
          status,
          publishAt: opts.publishAt ?? null,
          revision: 1,
        },
        update: {
          body,
          status,
          publishAt: opts.publishAt ?? null,
          revision: { increment: 1 },
        },
      });
      written++;
    }
  });

  await prisma.contentTemplate.update({
    where: { id: templateId },
    data: {
      status,
      publishedAt: status === "LIVE" ? new Date() : undefined,
    },
  });

  return written;
}
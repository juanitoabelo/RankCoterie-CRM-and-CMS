"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { PRESET_TEMPLATES } from "@/lib/listing-templates/presets";
import {
  DEFAULT_LISTING_TEMPLATE_BLOCKS,
  DEFAULT_CONTAINER_SETTINGS,
  serializeListingTemplateTree,
} from "@/lib/listing-templates/tree-types";
import type { ListingRowLike, RegionRow } from "@/components/site/listing/listing-view-model";
import type { ListingBlock, SidebarWidget, TemplateLayout, HeroVariant } from "@/lib/listing-templates/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Seed the 5 built-in presets once (first visit to Listing Layouts). */
export async function ensureListingTemplatePresets(): Promise<void> {
  await requireSection("listings");
  const existing = await prisma.listingTemplate.count({ where: { isPreset: true } });
  if (existing > 0) return;
  for (const preset of PRESET_TEMPLATES) {
    await prisma.listingTemplate.upsert({
      where: { slug: preset.slug },
      update: {},
      create: {
        name: preset.name,
        slug: preset.slug,
        description: preset.description,
        layout: preset.layout,
        heroVariant: preset.heroVariant,
        isPreset: true,
        blocks: serializeListingTemplateTree(preset.blocks, preset.containerSettings) as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

export async function listListingTemplates() {
  await requireSection("listings");
  return prisma.listingTemplate.findMany({
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    include: { _count: { select: { listings: true } } },
  });
}

export async function getListingTemplate(id: string) {
  await requireSection("listings");
  return prisma.listingTemplate.findUnique({ where: { id } });
}

export interface ListingTemplateInput {
  name: string;
  slug: string;
  description?: string;
  layout: TemplateLayout;
  heroVariant: HeroVariant;
  blocks: ListingBlock[];
  sidebar: SidebarWidget[];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "template";
}

export async function createListingTemplate(input: ListingTemplateInput): Promise<ActionResult> {
  await requireSection("listings");
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(input.slug || name);
  const clash = await prisma.listingTemplate.findUnique({ where: { slug } });
  if (clash) return { ok: false, error: `Slug "${slug}" is already in use.` };
  const created = await prisma.listingTemplate.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      layout: input.layout === "single" ? "single" : "sidebar",
      heroVariant: input.heroVariant || "default",
      blocks: (input.blocks ?? []) as unknown as Prisma.InputJsonValue,
      sidebar: (input.sidebar ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/admin/listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id: created.id };
}

export async function updateListingTemplate(id: string, input: ListingTemplateInput): Promise<ActionResult> {
  await requireSection("listings");
  const existing = await prisma.listingTemplate.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Template not found." };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(input.slug || name);
  if (slug !== existing.slug) {
    const clash = await prisma.listingTemplate.findUnique({ where: { slug } });
    if (clash) return { ok: false, error: `Slug "${slug}" is already in use.` };
  }
  await prisma.listingTemplate.update({
    where: { id },
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      layout: input.layout === "single" ? "single" : "sidebar",
      heroVariant: input.heroVariant || "default",
      blocks: (input.blocks ?? []) as unknown as Prisma.InputJsonValue,
      sidebar: (input.sidebar ?? []) as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/admin/listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deleteListingTemplate(id: string): Promise<ActionResult> {
  await requireSection("listings");
  const existing = await prisma.listingTemplate.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Template not found." };
  // Listings pointing at it fall back to the system default (onDelete: SetNull).
  await prisma.listingTemplate.delete({ where: { id } });
  revalidatePath("/admin/listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/**
 * Set a template as the site-wide default: every listing without an explicit
 * template assignment renders with it instead of the built-in system layout.
 */
export async function setDefaultListingTemplate(id: string | null): Promise<ActionResult> {
  await requireSection("listings");
  if (id) {
    const existing = await prisma.listingTemplate.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Template not found." };
  }
  await prisma.$transaction([
    prisma.listingTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    ...(id ? [prisma.listingTemplate.update({ where: { id }, data: { isDefault: true } })] : []),
  ]);
  revalidatePath("/admin/listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id: id ?? undefined };
}

/** Options for the listing form template picker (id + name, presets first). */
export async function listingTemplateOptions() {
  await requireSection("listings");
  const rows = await prisma.listingTemplate.findMany({
    select: { id: true, name: true, slug: true, isPreset: true },
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
  });
  return rows;
}

function parseJsonArray<T>(value: FormDataEntryValue | null): T[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Unified save used by the template editor (create + update). */
export async function saveListingTemplateForm(
  formData: FormData,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const id = formData.get("id");
  const input: ListingTemplateInput = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    layout: (formData.get("layout") as TemplateLayout) === "single" ? "single" : "sidebar",
    heroVariant: (formData.get("heroVariant") as HeroVariant) || "default",
    blocks: parseJsonArray<ListingBlock>(formData.get("blocksJson")),
    sidebar: parseJsonArray<SidebarWidget>(formData.get("sidebarJson")),
  };
  return typeof id === "string" && id ? updateListingTemplate(id, input) : createListingTemplate(input);
}

/* ── Tree-model builder actions ──────────────────────────────────────────── */

/** Create a new tree-model template with the default block layout; returns the id for the edit redirect. */
export async function createListingTemplateAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireSection("listings");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const clash = await prisma.listingTemplate.findUnique({ where: { slug } });
  if (clash) return { ok: false, error: `Slug "${slug}" is already in use.` };
  const created = await prisma.listingTemplate.create({
    data: {
      name,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      layout: "sidebar",
      heroVariant: "default",
      blocks: serializeListingTemplateTree(
        DEFAULT_LISTING_TEMPLATE_BLOCKS,
        DEFAULT_CONTAINER_SETTINGS,
      ) as unknown as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/admin/listing-layouts");
  return { ok: true, id: created.id };
}

/** Autosave endpoint for the tree builder: persists { blocks, containerSettings } into the blocks Json column. */
export async function updateListingTemplateBlocks(id: string, data: string): Promise<ActionResult> {
  await requireSection("listings");
  const existing = await prisma.listingTemplate.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Template not found." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return { ok: false, error: "Invalid template data." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Template data must be an object." };
  }
  await prisma.listingTemplate.update({
    where: { id },
    data: { blocks: parsed as Prisma.InputJsonValue },
  });
  revalidatePath("/admin/listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export interface ListingPreviewOptionRow {
  listing: ListingRowLike;
  regionRows: RegionRow[];
}

/** Approved listings (with categories/regions/reviews) for the Visual Display preview selector. */
export async function getListingPreviewOptions(): Promise<ListingPreviewOptionRow[]> {
  await requireSection("listings");
  const rows = await prisma.listing.findMany({
    where: { status: "LIVE" },
    include: {
      categories: { include: { category: true } },
      regions: true,
      reviews: { where: { status: "APPROVED" }, take: 3, orderBy: { createdAt: "desc" } },
    },
    orderBy: { title: "asc" },
    take: 8,
  });
  const regionIds = new Set<string>();
  for (const row of rows) {
    for (const r of row.regions) regionIds.add(r.regionId);
  }
  const regionRows = regionIds.size
    ? await prisma.region.findMany({
        where: { id: { in: [...regionIds] } },
        select: { id: true, state: true, stateFull: true, city: true },
      })
    : [];
  return rows.map((row) => ({
    listing: row as unknown as ListingRowLike,
    regionRows: regionRows.filter((rr) => row.regions.some((r) => r.regionId === rr.id)),
  }));
}

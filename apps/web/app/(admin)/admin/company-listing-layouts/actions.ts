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
import type { ListingBlock, SidebarWidget, TemplateLayout, HeroVariant } from "@/lib/listing-templates/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/** Seed the 5 built-in presets once (first visit to Company Listing Layouts). */
export async function ensureCompanyListingTemplatePresets(): Promise<void> {
  await requireSection("listings");
  const existing = await prisma.companyListingTemplate.count({ where: { isPreset: true } });
  if (existing > 0) return;
  for (const preset of PRESET_TEMPLATES) {
    await prisma.companyListingTemplate.upsert({
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

export async function listCompanyListingTemplates() {
  await requireSection("listings");
  return prisma.companyListingTemplate.findMany({
    orderBy: [{ isPreset: "desc" }, { name: "asc" }],
    include: { _count: { select: { listings: true } } },
  });
}

export async function getCompanyListingTemplate(id: string) {
  await requireSection("listings");
  return prisma.companyListingTemplate.findUnique({ where: { id } });
}

export interface CompanyListingTemplateInput {
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

export async function createCompanyListingTemplate(input: CompanyListingTemplateInput): Promise<ActionResult> {
  await requireSection("listings");
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(input.slug || name);
  const clash = await prisma.companyListingTemplate.findUnique({ where: { slug } });
  if (clash) return { ok: false, error: `Slug "${slug}" is already in use.` };
  const created = await prisma.companyListingTemplate.create({
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
  revalidatePath("/admin/company-listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id: created.id };
}

export async function updateCompanyListingTemplate(id: string, input: CompanyListingTemplateInput): Promise<ActionResult> {
  await requireSection("listings");
  const existing = await prisma.companyListingTemplate.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Template not found." };
  const name = input.name?.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(input.slug || name);
  if (slug !== existing.slug) {
    const clash = await prisma.companyListingTemplate.findUnique({ where: { slug } });
    if (clash) return { ok: false, error: `Slug "${slug}" is already in use.` };
  }
  await prisma.companyListingTemplate.update({
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
  revalidatePath("/admin/company-listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id };
}

export async function deleteCompanyListingTemplate(id: string): Promise<ActionResult> {
  await requireSection("listings");
  const existing = await prisma.companyListingTemplate.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Template not found." };
  // Listings pointing at it fall back to the system default (onDelete: SetNull).
  await prisma.companyListingTemplate.delete({ where: { id } });
  revalidatePath("/admin/company-listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/**
 * Set a template as the site-wide default: every company landing page without an explicit
 * template assignment renders with it instead of the built-in system layout.
 */
export async function setDefaultCompanyListingTemplate(id: string | null): Promise<ActionResult> {
  await requireSection("listings");
  if (id) {
    const existing = await prisma.companyListingTemplate.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Template not found." };
  }
  await prisma.$transaction([
    prisma.companyListingTemplate.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    ...(id ? [prisma.companyListingTemplate.update({ where: { id }, data: { isDefault: true } })] : []),
  ]);
  revalidatePath("/admin/company-listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id: id ?? undefined };
}

/** Options for the company listing form template picker (id + name, presets first). */
export async function companyListingTemplateOptions() {
  await requireSection("listings");
  const rows = await prisma.companyListingTemplate.findMany({
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
export async function saveCompanyListingTemplateForm(
  formData: FormData,
): Promise<{ ok: true; id?: string } | { ok: false; error: string }> {
  const id = formData.get("id");
  const input: CompanyListingTemplateInput = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    layout: (formData.get("layout") as TemplateLayout) === "single" ? "single" : "sidebar",
    heroVariant: (formData.get("heroVariant") as HeroVariant) || "default",
    blocks: parseJsonArray<ListingBlock>(formData.get("blocksJson")),
    sidebar: parseJsonArray<SidebarWidget>(formData.get("sidebarJson")),
  };
  return typeof id === "string" && id ? updateCompanyListingTemplate(id, input) : createCompanyListingTemplate(input);
}

/* ── Tree-model builder actions ──────────────────────────────────────────── */

/** Create a new tree-model template with the default block layout; returns the id for the edit redirect. */
export async function createCompanyListingTemplateAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireSection("listings");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const clash = await prisma.companyListingTemplate.findUnique({ where: { slug } });
  if (clash) return { ok: false, error: `Slug "${slug}" is already in use.` };
  const created = await prisma.companyListingTemplate.create({
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
  revalidatePath("/admin/company-listing-layouts");
  return { ok: true, id: created.id };
}

/** Autosave endpoint for the tree builder: persists { blocks, containerSettings } into the blocks Json column. */
export async function updateCompanyListingTemplateBlocks(id: string, data: string): Promise<ActionResult> {
  await requireSection("listings");
  const existing = await prisma.companyListingTemplate.findUnique({ where: { id } });
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
  await prisma.companyListingTemplate.update({
    where: { id },
    data: { blocks: parsed as Prisma.InputJsonValue },
  });
  revalidatePath("/admin/company-listing-layouts");
  revalidatePath("/", "layout");
  return { ok: true, id };
}
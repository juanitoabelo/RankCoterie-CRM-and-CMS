"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/modules/shared";
import { logAudit } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/modules/shared";
import { parseCsv } from "@/lib/admin/csv";
import {
  GEO_IMPORT_IMAGE_KEYS,
  IMAGE_POSITION,
  parseGeoCategoryImport,
  summarizeImportRows,
  type GeoImportRow,
} from "@/lib/admin/geo-category-import";
import { xlsxToMatrix } from "@/lib/admin/xlsx";

/** Comfort limit per file; the server-action body cap is 2 MB (next.config). */
const MAX_FILE_BYTES = 1.5 * 1024 * 1024;
const CREATE_CHUNK = 200;

export type ImportSummary = { total: number; create: number; update: number; skip: number; error: number };

export type PreviewRow = {
  row: number;
  title: string;
  slug: string;
  action: "create" | "update" | "skip";
  errors: string[];
};

export type GeoImportPreviewResult =
  | { ok: true; fileName: string; rows: PreviewRow[]; summary: ImportSummary; ignoredColumns: string[] }
  | { ok: false; error: string };

export type ImportFailure = { row: number; title: string; error: string };

export type GeoImportCommitResult =
  | {
      ok: true;
      fileName: string;
      created: number;
      updated: number;
      skipped: number;
      failed: ImportFailure[];
      ignoredColumns: string[];
    }
  | { ok: false; error: string };

type Prepared =
  | { ok: true; fileName: string; rows: GeoImportRow[]; ignoredColumns: string[]; updateExisting: boolean }
  | { ok: false; error: string };

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Unexpected database error.";
}

/**
 * Auth, file checks, parsing and a fresh existence lookup — shared by the
 * preview and commit actions so both always see identical validation.
 */
async function prepareImport(formData: FormData): Promise<Prepared> {
  await requireSection("categories");

  const updateExisting = formData.get("updateExisting") !== "false";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV or Excel (.xlsx) file to upload." };
  }
  const fileName = file.name || "import";
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
  if (ext !== ".csv" && ext !== ".xlsx") {
    return { ok: false, error: "Unsupported file type — upload a .csv or .xlsx file." };
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `File is ${mb} MB — the limit is 1.5 MB. Split the file and import in batches.` };
  }

  let matrix: string[][];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    matrix = ext === ".csv" ? parseCsv(buffer.toString("utf8")) : await xlsxToMatrix(buffer);
  } catch (e) {
    return { ok: false, error: `Could not read the file: ${errMessage(e)}` };
  }
  if (!matrix.length) return { ok: false, error: "The file is empty." };

  // Pass 1 computes final slugs and collects image asset IDs; pass 2 marks
  // create/update/skip and validates images with DB knowledge.
  const first = parseGeoCategoryImport(matrix, { updateExisting, existingSlugs: new Set() });
  if (!first.ok) return { ok: false, error: first.error };

  const slugs = [...new Set(first.rows.map((r) => r.slug).filter(Boolean))];
  const assetIds = [
    ...new Set(
      first.rows.flatMap((r) =>
        GEO_IMPORT_IMAGE_KEYS.map((k) => r.values[k]).filter((v): v is string => Boolean(v)),
      ),
    ),
  ];
  const [existing, assets] = await Promise.all([
    slugs.length
      ? prisma.category.findMany({
          where: { tenantId: TENANT_ID, slug: { in: slugs } },
          select: { slug: true },
        })
      : [],
    assetIds.length
      ? prisma.asset.findMany({
          where: { tenantId: TENANT_ID, id: { in: assetIds } },
          select: { id: true },
        })
      : [],
  ]);
  const second = parseGeoCategoryImport(matrix, {
    updateExisting,
    existingSlugs: new Set(existing.map((c) => c.slug)),
    knownAssetIds: new Set(assets.map((a) => a.id)),
  });
  if (!second.ok) return { ok: false, error: second.error };

  return { ok: true, fileName, rows: second.rows, ignoredColumns: second.ignoredColumns, updateExisting };
}

/** Parse + validate a spreadsheet without writing anything. */
export async function previewGeoCategoryImport(formData: FormData): Promise<GeoImportPreviewResult> {
  const prepared = await prepareImport(formData);
  if (!prepared.ok) return prepared;

  const rows: PreviewRow[] = prepared.rows.map((r) => ({
    row: r.row,
    title: r.title.length > 120 ? `${r.title.slice(0, 120)}…` : r.title,
    slug: r.slug,
    action: r.action,
    errors: r.errors,
  }));

  return {
    ok: true,
    fileName: prepared.fileName,
    rows,
    summary: summarizeImportRows(prepared.rows),
    ignoredColumns: prepared.ignoredColumns,
  };
}

/** Create/update the validated rows. Rows with errors are skipped and reported. */
export async function importGeoCategoryImport(formData: FormData): Promise<GeoImportCommitResult> {
  const actor = await requireSection("categories");
  const prepared = await prepareImport(formData);
  if (!prepared.ok) return prepared;

  const { fileName, rows, ignoredColumns } = prepared;

  const validCreates = rows.filter((r) => !r.errors.length && r.action === "create");
  const validUpdates = rows.filter((r) => !r.errors.length && r.action === "update");
  const skipped = rows.filter((r) => !r.errors.length && r.action === "skip").length;
  const failed: ImportFailure[] = rows
    .filter((r) => r.errors.length)
    .map((r) => ({ row: r.row, title: r.title || "—", error: r.errors.join(" ") }));

  if (!validCreates.length && !validUpdates.length) {
    if (failed.length) {
      return { ok: false, error: `Nothing to import — all rows are invalid (${failed.length} with errors).` };
    }
    return {
      ok: false,
      error:
        skipped > 0
          ? `Nothing to import — all ${skipped} row(s) already exist. Enable "Update existing" to overwrite them.`
          : "Nothing to import.",
    };
  }

  function createData(r: GeoImportRow): Prisma.CategoryCreateManyInput {
    return {
      tenantId: TENANT_ID,
      slug: r.slug,
      title: r.title,
      author: r.values.author ?? null,
      description: r.values.description ?? null,
      stateInit: r.values.stateInit ?? null,
      stateDesc: r.values.stateDesc ?? null,
      cityInit: r.values.cityInit ?? null,
      cityDesc: r.values.cityDesc ?? null,
      status: r.values.status ?? "LIVE",
      seoTitle: r.values.seoTitle ?? null,
      metaDesc: r.values.metaDesc ?? null,
      metaKeywords: r.values.metaKeywords ?? null,
      focusKeyphrase: r.values.focusKeyphrase ?? null,
      canonicalUrl: r.values.canonicalUrl ?? null,
      ogImage: r.values.ogImage ?? null,
    };
  }

  /** Blank cells leave the existing value untouched on update. */
  function updateData(r: GeoImportRow): Prisma.CategoryUpdateInput {
    const data: Prisma.CategoryUpdateInput = { title: r.title };
    const nullable = [
      "author",
      "description",
      "stateInit",
      "stateDesc",
      "cityInit",
      "cityDesc",
      "status",
      "seoTitle",
      "metaDesc",
      "metaKeywords",
      "focusKeyphrase",
      "canonicalUrl",
      "ogImage",
    ] as const;
    for (const key of nullable) {
      const value = r.values[key];
      if (value !== null && value !== undefined) data[key] = value;
    }
    return data;
  }

  let created = 0;
  let updated = 0;
  const succeeded: GeoImportRow[] = [];

  for (let i = 0; i < validCreates.length; i += CREATE_CHUNK) {
    const chunk = validCreates.slice(i, i + CREATE_CHUNK);
    try {
      await prisma.category.createMany({ data: chunk.map(createData) });
      created += chunk.length;
      succeeded.push(...chunk);
    } catch {
      // Isolate the poisoned row (e.g. a slug that raced in) instead of failing the batch.
      for (const row of chunk) {
        try {
          await prisma.category.create({ data: createData(row) });
          created++;
          succeeded.push(row);
        } catch (e) {
          failed.push({ row: row.row, title: row.title, error: errMessage(e) });
        }
      }
    }
  }

  for (const row of validUpdates) {
    try {
      await prisma.category.update({
        where: { tenantId_slug: { tenantId: TENANT_ID, slug: row.slug } },
        data: updateData(row),
      });
      updated++;
      succeeded.push(row);
    } catch (e) {
      failed.push({ row: row.row, title: row.title, error: errMessage(e) });
    }
  }

  // Parent/State/City images: blank cells leave existing images untouched.
  const withImages = succeeded.filter((r) => GEO_IMPORT_IMAGE_KEYS.some((k) => r.values[k]));
  if (withImages.length) {
    const imageSlugs = [...new Set(withImages.map((r) => r.slug))];
    const categories = await prisma.category.findMany({
      where: { tenantId: TENANT_ID, slug: { in: imageSlugs } },
      select: { id: true, slug: true },
    });
    const idBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    for (const row of withImages) {
      const categoryId = idBySlug.get(row.slug);
      if (!categoryId) continue;
      for (const key of GEO_IMPORT_IMAGE_KEYS) {
        const imageAssetId = row.values[key];
        if (!imageAssetId) continue;
        try {
          const position = IMAGE_POSITION[key];
          const existing = await prisma.categoryImage.findFirst({
            where: { tenantId: TENANT_ID, categoryId, position },
            select: { id: true },
          });
          if (existing) {
            await prisma.categoryImage.update({
              where: { id: existing.id },
              data: { imageAssetId, isPrimary: position === "PRIMARY" },
            });
          } else {
            await prisma.categoryImage.create({
              data: {
                tenantId: TENANT_ID,
                categoryId,
                imageAssetId,
                position,
                isPrimary: position === "PRIMARY",
              },
            });
          }
        } catch (e) {
          failed.push({
            row: row.row,
            title: row.title,
            error: `Row saved, but its image could not be saved: ${errMessage(e)}`,
          });
        }
      }
    }
  }

  await logAudit({
    action: "CATEGORY_BULK_IMPORT",
    entity: "Category",
    entityId: fileName,
    meta: { created, updated, skipped, failed: failed.length, updateExisting: prepared.updateExisting },
    actorId: actor.id,
  });
  revalidatePath("/admin/geo-categories");

  return { ok: true, fileName, created, updated, skipped, failed, ignoredColumns };
}

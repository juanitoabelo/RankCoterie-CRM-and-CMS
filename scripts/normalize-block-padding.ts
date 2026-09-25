#!/usr/bin/env npx tsx
/**
 * Canopy V2 — Normalize Section/Row default padding in saved builder blocks.
 *
 * The builder previously baked large defaults into sections/rows when they were
 * created (section paddingTop/paddingBottom 24–48, row paddingY 16–24). Now the
 * defaults are 10px and spacing is meant to be driven through each block's
 * Advanced → Margin/Padding settings. This script rewrites the saved JSON so
 * existing content matches the new default (10px) unless the row/section was
 * explicitly customized via the Advanced Padding controls (props.padding present).
 *
 * Idempotent: re-running only touches rows/sections still carrying the old
 * non-10 values without an explicit props.padding override.
 *
 * Usage (from repo root):
 *   npx tsx scripts/normalize-block-padding.ts            # dry-run, prints counts
 *   npx tsx scripts/normalize-block-padding.ts --apply    # writes to the DB
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Env bootstrap (next/prisma do not auto-load .env for plain scripts)
// ---------------------------------------------------------------------------

function loadEnv(): void {
  if (process.env.DATABASE_URL) return;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(here, "..", "apps/web/.env.local"),
    path.join(here, "..", "apps/web/.env"),
    path.join(here, "..", "packages/db/.env"),
    path.join(here, "..", ".env"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    const match = text.match(/^\s*DATABASE_URL\s*=\s*"?([^"\n#]+)"?\s*$/m);
    if (match) {
      process.env.DATABASE_URL = match[1];
      return;
    }
  }
}

loadEnv();

// ---------------------------------------------------------------------------
// Normalization core
// ---------------------------------------------------------------------------

const TARGET_PADDING = 10;

type Block = { type?: string; props?: Record<string, unknown> };

/** Recursively normalize a block tree. Returns true if anything changed. */
function normalizeBlock(block: Block): boolean {
  let changed = false;
  const props = block.props ?? {};
  const customized = props.padding !== undefined; // user drove the Advanced controls

  if (!customized) {
    if (block.type === "row") {
      const y = props.paddingY;
      if (typeof y === "number" && y !== TARGET_PADDING) {
        props.paddingY = TARGET_PADDING;
        changed = true;
      }
    }
    if (block.type === "section") {
      for (const key of ["paddingTop", "paddingBottom"] as const) {
        const value = props[key];
        if (typeof value === "number" && value !== TARGET_PADDING) {
          props[key] = TARGET_PADDING;
          changed = true;
        }
      }
    }
  }

  const rows = props.rows;
  if (Array.isArray(rows)) {
    for (const row of rows as Block[]) {
      if (normalizeBlock(row)) changed = true;
    }
  }

  const columns = props.columns;
  if (Array.isArray(columns)) {
    for (const column of columns as Array<{ blocks?: Block[] }>) {
      const columnBlocks = column.blocks;
      if (Array.isArray(columnBlocks)) {
        for (const b of columnBlocks) {
          if (normalizeBlock(b)) changed = true;
        }
      }
    }
  }

  return changed;
}

/** Normalize a parsed `data` payload (either a Block[] or { blocks, ... }). */
function normalizePayload(data: unknown): boolean {
  if (Array.isArray(data)) return data.some((b) => normalizeBlock(b as Block));
  if (data && typeof data === "object") {
    const maybe = data as { blocks?: unknown };
    if (Array.isArray(maybe.blocks)) {
      return maybe.blocks.some((b) => normalizeBlock(b as Block));
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

async function main() {
  const results: Array<{ label: string; checked: number; changed: number }> = [];

  const sources: Array<{ label: string; fetch: () => Promise<any[]> }> = [
    { label: "page", fetch: () => prisma.page.findMany({ select: { id: true, data: true } }) },
    { label: "pageRevision", fetch: () => prisma.pageRevision.findMany({ select: { id: true, data: true } }) },
    { label: "headerFooter", fetch: () => prisma.headerFooter.findMany({ select: { id: true, data: true } }) },
    { label: "headerFooterRevision", fetch: () => prisma.headerFooterRevision.findMany({ select: { id: true, data: true } }) },
    { label: "pageLayout", fetch: () => prisma.pageLayout.findMany({ select: { id: true, data: true } }) },
    { label: "pageLayoutRevision", fetch: () => prisma.pageLayoutRevision.findMany({ select: { id: true, data: true } }) },
    { label: "blogTemplate", fetch: () => prisma.blogTemplate.findMany({ select: { id: true, data: true } }) },
    { label: "blogTemplateRevision", fetch: () => prisma.blogTemplateRevision.findMany({ select: { id: true, data: true } }) },
    { label: "snippet", fetch: () => prisma.snippet.findMany({ select: { id: true, block: true } }) },
  ];

  const modelByLabel: Record<string, any> = {
    page: prisma.page,
    pageRevision: prisma.pageRevision,
    headerFooter: prisma.headerFooter,
    headerFooterRevision: prisma.headerFooterRevision,
    pageLayout: prisma.pageLayout,
    pageLayoutRevision: prisma.pageLayoutRevision,
    blogTemplate: prisma.blogTemplate,
    blogTemplateRevision: prisma.blogTemplateRevision,
    snippet: prisma.snippet,
  };

  for (const source of sources) {
    const rows = await source.fetch();
    let changedCount = 0;
    let errorCount = 0;
    for (const row of rows) {
      let parsed: unknown;
      try {
        const raw = ("data" in row ? row.data : row.block) as string | object | null;
        if (raw === null || raw === undefined || raw === "") continue;
        const target = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!normalizePayload(target)) continue;
        changedCount += 1;
        if (APPLY) {
          const data: any = typeof ("data" in row ? row.data : row.block) === "string" ? JSON.stringify(target) : target;
          try {
            await modelByLabel[source.label].update({ where: { id: row.id }, data: { [source.label === "snippet" ? "block" : "data"]: data } });
          } catch (e) {
            errorCount += 1;
            console.error(`    ! ${source.label} ${row.id} update failed:`, e instanceof Error ? e.message : e);
          }
        }
      } catch {
        // skip malformed JSON rows
      }
    }
    results.push({ label: source.label, checked: rows.length, changed: changedCount, errors: errorCount });
  }

  const totalChanged = results.reduce((sum, r) => sum + r.changed, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  console.log(`\n${APPLY ? "Normalized" : "DRY-RUN (add --apply to write)"} section/row default padding -> ${TARGET_PADDING}px:`);
  for (const r of results) {
    const errors = r.errors ? `  errors=${r.errors}` : "";
    console.log(`  ${r.label.padEnd(22)} checked=${String(r.checked).padStart(4)}  changed=${r.changed}${errors}`);
  }
  console.log(`  ${"TOTAL".padEnd(22)}               changed=${totalChanged}${totalErrors ? `  errors=${totalErrors}` : ""}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
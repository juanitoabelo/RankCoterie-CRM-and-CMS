/**
 * Canopy V2 — built-in header/footer starter presets seed (ADDITIVE, idempotent).
 *
 * Materialises the ten code-defined starter templates (5 headers + 5 futuristic
 * footers) as real, editable `HeaderFooter` rows so they appear in the builder's
 * template list. Existing rows with the same name are refreshed in place; the
 * first header and first footer are marked as the global default only when the
 * tenant has no default of that type yet.
 *
 * The preset definitions live in `apps/web/lib/header-footer/presets.ts` (single
 * source of truth, shared with the admin starter gallery). Node imports that
 * `.ts` file directly via native type stripping.
 *
 * Run:   npm run db:seed:header-footers --workspace=db
 * Clean: npm run db:seed:header-footers --workspace=db -- --clean
 */

import { PrismaClient } from "@prisma/client";
import {
  HEADER_PRESETS,
  FOOTER_PRESETS,
  serializePreset,
} from "../../../apps/web/lib/header-footer/presets.ts";

const prisma = new PrismaClient();
const TENANT_ID = "tenant-masternet";

const clean = process.argv.includes("--clean");

async function main() {
  if (clean) {
    const names = [...HEADER_PRESETS, ...FOOTER_PRESETS].map((p) => p.name);
    const { count } = await prisma.headerFooter.deleteMany({
      where: { tenantId: TENANT_ID, name: { in: names } },
    });
    console.log(`Removed ${count} seeded header/footer preset(s).`);
    return;
  }

  const byType: Array<["HEADER" | "FOOTER", typeof HEADER_PRESETS]> = [
    ["HEADER", HEADER_PRESETS],
    ["FOOTER", FOOTER_PRESETS],
  ];

  let created = 0;
  let updated = 0;

  for (const [type, presets] of byType) {
    const existingDefault = await prisma.headerFooter.findFirst({
      where: { tenantId: TENANT_ID, type, isDefault: true },
      select: { id: true },
    });

    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      const data = serializePreset(preset);
      const existing = await prisma.headerFooter.findFirst({
        where: { tenantId: TENANT_ID, name: preset.name },
        select: { id: true },
      });

      if (existing) {
        await prisma.headerFooter.update({
          where: { id: existing.id },
          data: { type: preset.type, data },
        });
        updated += 1;
      } else {
        await prisma.headerFooter.create({
          data: {
            tenantId: TENANT_ID,
            name: preset.name,
            type: preset.type,
            data,
            // Only the very first preset of a type becomes the default, and
            // only when nothing is default yet.
            isDefault: i === 0 && !existingDefault,
          },
        });
        created += 1;
      }
    }
  }

  console.log(
    `Header/footer presets seeded — ${created} created, ${updated} updated.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

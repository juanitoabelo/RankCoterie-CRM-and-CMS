#!/usr/bin/env npx tsx
/**
 * Backfill CRM lead automation: scores every lead and auto-assigns unowned leads
 * when the tenant setting is enabled.
 *
 * Usage:
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/scripts/crm-backfill.ts
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/scripts/crm-backfill.ts --no-assign
 *   npx tsx --tsconfig apps/web/tsconfig.json apps/web/scripts/crm-backfill.ts --no-score
 */

import { backfillLeadAutomation } from "@/modules/crm/automation";
import { prisma } from "@/modules/shared";

async function main() {
  const args = new Set(process.argv.slice(2));
  const result = await backfillLeadAutomation({
    autoAssign: !args.has("--no-assign"),
    score: !args.has("--no-score"),
  });
  console.log(
    `CRM backfill complete: ${result.processed} lead(s), ${result.scored} scored, ${result.assigned} assigned.`,
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

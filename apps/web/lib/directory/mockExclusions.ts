/**
 * Phase-1 stand-in for the admin-managed exclusion/opt-out list (§6.7).
 *
 * In Phase 2 this becomes a DB-backed read (ExcludedCompany), passed into the
 * visibility gate by the real query layer. Kept as a separate module so the swap
 * touches one file.
 */

import type { ExclusionRule } from "./visibility";

export function getMockExclusions(): ExclusionRule[] {
  return [
    // Companies the operator never wants displayed — matched by domain key.
    { domainKey: "a-competitor-inc" },
    { companyNameContains: "Do Not Display" },
  ];
}
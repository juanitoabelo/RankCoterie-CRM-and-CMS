# Canopy V2 — Remaining Work Reference

Copied from `HANDOFF_PART_B.md` on 2026-09-04 before continuing implementation.

## Remaining Checklist

### Database
- [x] B0c. Created and applied the Phase B migration to the configured Supabase database through the direct PostgreSQL endpoint, then synchronized Prisma's migration ledger with the exact migration checksum.

### Admin Features
- [x] B2. Added multi-file browser upload and bulk assignment, reusing `/api/uploads`.
- [x] B5. Added Widget Placement management for slot/location, order, and active state.

### Category Content
- [x] C1. Added `stateInit`, `stateDesc`, `cityInit`, and `cityDesc` inputs and persistence.

### Public Rendering
- [x] D1. Rendered the active HEADER menu in `app/(site)/layout.tsx`.
- [x] D2. Rendered live sections and active HOME widgets on the public homepage.
- [x] D3. Wired Company tracking and verification fields into the public layout.

### Verification
- [x] E2. Full web tests pass: 147 passed, 6 integration tests skipped; changed files have no diagnostics. Existing unrelated TypeScript errors remain documented in the original handoff.
- [x] E3. Production build compiled successfully through optimization; the TypeScript failures reported by the build were fixed in `content-grid`, page-builder typing, and the slider test fixture. Direct TypeScript diagnostics are now clean for the repaired files.

## Known Security Follow-up

- [x] Require authorization and sanitize/validate Style Guide values before injecting public CSS.
- [x] Fail closed when `SESSION_SECRET` is missing in production.
- [x] Remove the known default Super Admin password fallback outside local development.
- [x] Enforce role checks on sensitive API routes.
- [x] Enforce tenant validation for referenced assets/categories/regions and user mutations.

# Canopy V2 — Build Handoff / Resume Plan

> Copy of the working TODO + status so this can be resumed in a later session.
> Updated: 2026-09-03.

## Overall Objective
Re-group the Canopy admin sidebar into a classified menu and build the full set of
admin content features (Sections, Geo Category Images, Widget Builder, Users, My
Company, Menu Builder) plus convert admin auth from an HMAC `ADMIN_SECRET` to
per-user role-based accounts.

## Decisions (user-confirmed)
- Default Super Admin = `juanito.abelo@gmail.com`.
- Fully remove old `ADMIN_SECRET` HMAC auth → standard email+password user login.
- Roles: SUPER_ADMIN, ADMIN, EDITOR, MARKETING, REVIEWER, SALES_REP, GRACE_COACH.
- SUPER_ADMIN can disable premium-only features for self-hosted clients.
- Widgets = free-form HTML ads block with featured image upload (`/api/uploads`)
  that redirects to a page/article/any content type.
- My Company tracking fields: GA4, GTM, FB Pixel, Google Search Console, GSC verification tag.
- Menu Builder: multiple named menus with location = HEADER | FOOTER | SIDEBAR.
- Use lightweight signed-session cookies (no Auth.js). Zero native deps → use
  Node `crypto.scrypt` for passwords and Web Crypto HMAC for sessions.

## DONE (verify + commit)
### Auth conversion (A1–A8) — COMPLETE, typechecks clean, tests pass
- `packages/db/prisma/schema.prisma`: Role enum now has SUPER_ADMIN, EDITOR
  (kept ADMIN, MARKETING, REVIEWER, SALES_REP, GRACE_COACH). Prisma client
  regenerated (`npx prisma generate`).
- `apps/web/lib/passwords.ts`: scrypt hash/verify (format `scrypt$N$r$p$salt$hash`).
- `apps/web/lib/session-token.ts`: edge-safe session codec (Web Crypto HMAC-SHA256),
  exports `SESSION_COOKIE`, `SESSION_TTL_SECONDS`, `signSessionToken`,
  `encodeSessionPayload`, `decodeSessionPayload`, `readSessionValue`.
- `apps/web/lib/admin-auth.ts`: per-user session auth. Exports `createSession`,
  `getSessionUid`, `destroySession`, `getCurrentUser`, `requireUser`,
  `requireSection(sectionKey)`, `getApiUser`, `canAccessSection`, `isSuperAdmin`,
  `SECTION_ROLES` permission map. Uses `prisma.user.findUnique({ include: { roles: true } })`.
- `apps/web/lib/bootstrap.ts`: `ensureSuperAdmin()` first-run bootstrap
  (idempotent; email/password from env `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`,
  default temp `SuperAdmin123!`).
- `apps/web/app/(admin)/admin/login/actions.ts`: `adminLogin` (email+password via
  verifyPassword → createSession → redirect /admin) + `adminLogout`.
- `apps/web/app/(admin)/admin/login/page.tsx`: email+password form.
- `apps/web/proxy.ts`: admin guard now validates signed session cookie
  (`readSessionValue`) instead of HMAC secret. Allows `/admin/login` through.
- `apps/web/app/(admin)/admin/layout.tsx`: role-aware nav (filters sections by
  `canAccessSection`), shows user name + Super Admin badge, sign-out form.
- 4 API routes converted to `getApiUser()`:
  `app/api/uploads`, `app/api/snippets`, `app/api/snippets/[id]`, `app/api/admin/exports`.
- `apps/web/lib/audit.ts`: added USER_*/SECTION_*/CATEGORY_IMAGE_*/MENU_*/WIDGET_*/COMPANY_UPDATE actions.

### A9 Users CRUD — COMPLETE, typechecks clean (NOT yet run/tested end-to-end)
- `apps/web/app/(admin)/admin/users/actions.ts`: `listUsers`, `createUser`,
  `updateUser`, `deleteUser`, `ALL_ROLES`, `*Form` wrappers. Gated by
  `requireSection("users")` (Super Admin only). Multi-role via `formData.getAll("roles")`.
- `apps/web/app/(admin)/admin/users/page.tsx`: list + add-user form (role checkboxes).
- `apps/web/app/(admin)/admin/users/[id]/edit/page.tsx`: edit form (name/email/
  password reset/roles/active/delete).

### Verification done
- All 147 unit tests pass (6 DB integration tests skipped).
- `tsc --noEmit`: NO new errors in my files. 10 pre-existing errors remain in
  UNRELATED files (BlockRenderer.tsx, BlockEditor.tsx, content-grid/route.ts,
  validate.test.ts, regions/[id]/edit/page.tsx) — do NOT "fix" those unless asked.

## FULL TODO LIST (checklist — resume here)

### Phase A — Auth conversion (all DONE, verified)
- [x] A1. Schema: add `SUPER_ADMIN` + `EDITOR` to `Role` enum; `prisma generate`
- [x] A2. `lib/passwords.ts` (scrypt hash/verify)
- [x] A3. `lib/session-token.ts` (edge-safe HMAC session codec)
- [x] A3b. `lib/admin-auth.ts` (sessions + roles + permission map)
- [x] A4. `lib/bootstrap.ts` (first-run Super Admin)
- [x] A5. Login rewrite: email+password (`login/actions.ts` + `login/page.tsx`)
- [x] A6. `proxy.ts` session guard (replaces HMAC secret)
- [x] A7. Role-aware `admin/layout.tsx` nav + user display
- [x] A8. Convert 4 API routes to `getApiUser()` (uploads, snippets, snippets/[id], exports)
- [x] A9. `/admin/users` CRUD (actions, list page, [id]/edit page) — built + typechecks clean
- [x] A10. Add USER_* audit actions + unit tests for session-token (6 tests)

### Phase B — Admin content features (all PENDING unless noted)
- [ ] B0. Add Prisma models to `packages/db/prisma/schema.prisma`:
      `Section`, `Company`, `Menu`, `MenuItem`, `Widget`, `WidgetPlacement`,
      `CategoryImage` (see details below)
- [ ] B0b. `npx prisma generate` after schema edit (no DB needed)
- [ ] B0c. Run/create DB migration (`npx prisma migrate dev`) — needs DB connection
- [ ] B1. Sections CRUD at `app/(admin)/admin/sections/`
      (actions.ts + page.tsx + [id]/edit). Gate `requireSection("sections")`
- [ ] B2. Geo Category Images at `app/(admin)/admin/geo-images/` + bulk upload
      (reuse `app/api/uploads`). Gate `requireSection("geoImages")`
- [ ] B3. My Company at `app/(admin)/admin/my-company/` (tracking fields →
      Company model). Gate `requireSection("myCompany")`
- [ ] B4. Menu Builder at `app/(admin)/admin/menus/` (named menus + location
      HEADER|FOOTER|SIDEBAR). Gate `requireSection("menus")`
- [ ] B5. Widget Builder at `app/(admin)/admin/widgets/` (HTML + featured image +
      redirectUrl). Gate `requireSection("widgets")`

### Phase C — Category geo fields
- [ ] C1. `components/admin/CategoryForm.tsx`: extend with stateInit/stateDesc/
      cityInit/cityDesc inputs (schema fields already exist on `Category`)

### Phase D — Public rendering
- [ ] D1. `app/(site)/layout.tsx`: render HEADER menu from Menu Builder
- [ ] D2. Render widgets / sections where appropriate (site pages)
- [ ] D3. Wire up tracking fields (GA4/GTM/FB Pixel/GSC) from Company in layouts

### Phase E — Navigation, tests, build
- [ ] E1. Link the now-live nav items in `app/(admin)/admin/layout.tsx`
      (flip `soon` placeholders to real links / remove them)
- [ ] E2. Run full test suite (`npx vitest run`) + tsc — confirm no new errors
- [ ] E3. `npm run build` / `next build` verification

### New-model field details (for B0)
- `Section`: id, tenantId, slug, title, heading?, body?, order, status,
  categoryId? (rel to Category?) — content sections.
- `Company`: id, tenantId, name, tracking fields (ga4, gtm, fbPixel,
  searchConsole, gscVerificationTag), branding?. Relate via `Tenant.companyId`.
- `Menu`: id, tenantId, name, location enum(HEADER|FOOTER|SIDEBAR).
- `MenuItem`: id, menuId, label, href, order, parentId? (nesting), target?.
- `Widget`: id, tenantId, name, html (free-form), imageAssetId? (featured),
  redirectUrl?, active. Placements WidgetPlacement[].
- `WidgetPlacement`: id, widgetId, slot/location, order, active.
- `CategoryImage`: id, tenantId, categoryId?, regionId?, imageAssetId,
  position/order, isPrimary.
- NOTE: `Category` ALREADY has stateInit/stateDesc/cityInit/cityDesc (Part C
  geo fields already in schema).
- B0c migration ⚠️ NEEDS DB CONNECTION. Remote Supabase pooler timed out from
  this sandbox; if it still fails, create a migration manually
  (`prisma migrate dev --create-only`) or run when DB reachable. Do NOT apply
  blindly to the shared remote DB without confirming it's the intended dev DB.

## Relevant files (patterns to mirror)
- CRUD pattern: `app/(admin)/admin/style-guide/actions.ts` + `page.tsx`
  (ActionResult type, `*Form` void wrapper because Next form actions must return
  Promise<void>, revalidatePath, logAudit).
- `app/(admin)/admin/categories/` + `regions/actions.ts`: reference patterns.
- `apps/web/lib/directory/prismaCatalog.ts`: exports `prisma` + fixed
  `TENANT_ID = env.CANOPY_TENANT_ID ?? "tenant-masternet"`.
- `apps/web/app/api/uploads/route.ts`: reuse for widget/geo image uploads
  (returns `{ url: "/api/assets/[id]" }`, 8MB, jpeg/png/webp/gif/avif/svg).
- `apps/web/app/(site)/layout.tsx`: already injects Global Style Guide CSS;
  add HEADER menu here.
- `apps/web/lib/style-guide.ts` + `app/(admin)/admin/style-guide/`: completed feature.

## Commands
- Tests: `cd apps/web && npx vitest run lib` (fast) or full `npx vitest run`.
- Typecheck: `cd apps/web && ../../node_modules/.bin/tsc --noEmit` (ignore `.next/`
  and the 10 pre-existing errors listed above).
- Prisma generate: `cd packages/db && npx prisma generate`.
- Migrate: `cd packages/db && npx prisma migrate dev` (needs working DB).

## Environment notes
- DB: remote Supabase (`packages/db/.env`, both DATABASE_URL and DIRECT_URL).
  Connectivity timed out in this sandbox.
- Do NOT modify `.env` secrets or commit them.

# Canopy V2 — Modularization Plan

## Objective
Refactor the codebase into feature-based modules with clear boundaries. Each module contains its own components, actions, types, and utilities. Only touch modules being refactored; existing working features remain untouched.

## Current State Analysis

### Admin Modules (app/(admin)/admin/)
- **articles/** — Content template management
- **categories/** — Topic/category management
- **clients/** — Client management
- **content/** — Content CMS
- **exclusions/** — Company exclusions
- **feeds/** — RSS/data feeds
- **geo-images/** — Geographic category images
- **invoices/** — Invoice management
- **leads/** — Lead management
- **listings/** — Directory listings (has pagination)
- **login/** — Authentication
- **menus/** — Menu builder
- **merchants/** — Merchant management
- **my-company/** — Company settings
- **pages/** — Page builder
- **regions/** — Geographic regions
- **reports/** — Reports & exports
- **sections/** — Content sections
- **style-guide/** — Design system
- **templates/** — Content templates
- **users/** — User management (has pagination)
- **widgets/** — Widget builder

### Shared Libs (lib/)
- **admin-auth.ts** — Authentication & authorization
- **directory/** — Catalog repo, Prisma client
- **localization/** — Content rendering
- **audit.ts** — Audit logging
- **passwords.ts** — Password hashing
- **session-token.ts** — Session management
- **tenant.ts** — Tenant configuration
- **style-guide.ts** — Style guide utilities

### Site Pages (app/(site)/)
- **page.tsx** — Home page
- **g/[category]/** — Category pages
- **g/[category]/[region]/** — Region listing pages
- **article/[slug]/** — Article pages
- **apply/** — Application form
- **checkout/** — Payment flows

## Modularization Strategy

### Phase 1: Feature Modules Structure
Create a `modules/` directory at the root with self-contained feature modules.

```
modules/
├── listings/
│   ├── index.ts          # Public API
│   ├── types.ts          # TypeScript types
│   ├── actions.ts        # Server actions
│   ├── queries.ts        # Database queries
│   ├── components/       # React components
│   │   ├── ListingTable.tsx
│   │   ├── ListingForm.tsx
│   │   └── ListingFilters.tsx
│   └── __tests__/        # Module tests
├── users/
│   ├── index.ts
│   ├── types.ts
│   ├── actions.ts
│   ├── queries.ts
│   ├── components/
│   │   ├── UserTable.tsx
│   │   ├── UserForm.tsx
│   │   └── UserSearch.tsx
│   └── __tests__/
├── leads/
│   ├── index.ts
│   ├── types.ts
│   ├── actions.ts
│   ├── queries.ts
│   ├── components/
│   │   ├── LeadTable.tsx
│   │   └── LeadForm.tsx
│   └── __tests__/
├── auth/
│   ├── index.ts
│   ├── types.ts
│   ├── session.ts
│   ├── permissions.ts
│   └── __tests__/
├── content/
│   ├── index.ts
│   ├── types.ts
│   ├── articles/
│   ├── categories/
│   ├── pages/
│   ├── sections/
│   └── templates/
├── geo/
│   ├── index.ts
│   ├── types.ts
│   ├── regions/
│   └── geo-images/
├── billing/
│   ├── index.ts
│   ├── types.ts
│   ├── invoices/
│   ├── clients/
│   └── merchants/
├── dashboard/
│   ├── index.ts
│   ├── widgets/
│   └── reports/
└── shared/
    ├── prisma.ts         # Prisma client singleton
    ├── tenant.ts         # Tenant utilities
    ├── cache.ts          # Caching utilities
    └── ui/               # Shared UI components
```

### Phase 2: Module Implementation Order

#### Step 1: Auth Module (Priority: High)
**Files to create:**
- `modules/auth/index.ts` — Export public API
- `modules/auth/types.ts` — AdminUser, Role types
- `modules/auth/session.ts` — Session management (move from lib/session-token.ts)
- `modules/auth/permissions.ts` — Role-based access (move from lib/admin-auth.ts)
- `modules/auth/__tests__/auth.test.ts` — Tests

**Files to update:**
- `app/(admin)/admin/layout.tsx` — Import from `@/modules/auth`
- `app/(admin)/admin/login/actions.ts` — Import from `@/modules/auth`

**Files to keep untouched:**
- All other admin pages (they import from lib/admin-auth.ts which will re-export)

#### Step 2: Listings Module (Priority: High)
**Files to create:**
- `modules/listings/index.ts`
- `modules/listings/types.ts` — Listing, ListingStatus, ListingTier
- `modules/listings/queries.ts` — Database queries
- `modules/listings/actions.ts` — Server actions (approve, reject)
- `modules/listings/components/ListingTable.tsx`
- `modules/listings/components/ListingFilters.tsx`
- `modules/listings/components/Pagination.tsx`

**Files to update:**
- `app/(admin)/admin/listings/page.tsx` — Use module components

**Files to keep untouched:**
- `app/(admin)/admin/listings/[id]/edit/page.tsx` (until Phase 3)

#### Step 3: Users Module (Priority: High)
**Files to create:**
- `modules/users/index.ts`
- `modules/users/types.ts`
- `modules/users/queries.ts`
- `modules/users/actions.ts`
- `modules/users/components/UserTable.tsx`
- `modules/users/components/UserSearch.tsx`
- `modules/users/components/Pagination.tsx`

**Files to update:**
- `app/(admin)/admin/users/page.tsx` — Use module components

#### Step 4: Leads Module (Priority: Medium)
**Files to create:**
- `modules/leads/index.ts`
- `modules/leads/types.ts`
- `modules/leads/queries.ts`
- `modules/leads/actions.ts`
- `modules/leads/components/LeadTable.tsx`
- `modules/leads/components/LeadFilters.tsx`

**Files to update:**
- `app/(admin)/admin/leads/page.tsx`

#### Step 5: Content Module (Priority: Medium)
**Files to create:**
- `modules/content/index.ts`
- `modules/content/types.ts`
- `modules/content/articles/` — Article sub-module
- `modules/content/categories/` — Category sub-module
- `modules/content/pages/` — Page sub-module
- `modules/content/sections/` — Section sub-module
- `modules/content/templates/` — Template sub-module

**Files to update:**
- Respective admin pages

#### Step 6: Geo Module (Priority: Medium)
**Files to create:**
- `modules/geo/index.ts`
- `modules/geo/types.ts`
- `modules/geo/regions/` — Region sub-module
- `modules/geo/geo-images/` — Geo image sub-module

#### Step 7: Billing Module (Priority: Low)
**Files to create:**
- `modules/billing/index.ts`
- `modules/billing/types.ts`
- `modules/billing/invoices/`
- `modules/billing/clients/`
- `modules/billing/merchants/`

#### Step 8: Dashboard Module (Priority: Low)
**Files to create:**
- `modules/dashboard/index.ts`
- `modules/dashboard/widgets/`
- `modules/dashboard/reports/`

### Phase 3: Shared Utilities

**Create `modules/shared/`:**
- `modules/shared/prisma.ts` — Re-export from lib/directory/prismaCatalog
- `modules/shared/tenant.ts` — Re-export from lib/tenant
- `modules/shared/cache.ts` — Caching utilities
- `modules/shared/ui/` — Shared UI components (Pagination, Badge, etc.)

### Phase 4: Update Imports

**Strategy:**
1. Each module exports its public API via `index.ts`
2. Admin pages import from `@/modules/[feature]`
3. Shared libs re-export module APIs for backward compatibility
4. Gradual migration — no big bang

**Import pattern:**
```typescript
// Before
import { prisma } from "@/lib/directory/prismaCatalog";
import { getCurrentUser } from "@/lib/admin-auth";

// After
import { prisma } from "@/modules/shared/prisma";
import { getCurrentUser } from "@/modules/auth";
```

## Implementation Rules

### Rule 1: Non-Breaking Changes
- Create module files alongside existing code
- Update imports gradually
- Keep re-exports in old locations for backward compatibility

### Rule 2: Module Boundaries
- Each module owns its types, queries, actions, and components
- Cross-module imports only via public API (index.ts)
- No direct imports between module internals

### Rule 3: Testing
- Each module has its own `__tests__/` directory
- Tests import from module's public API
- Integration tests verify module boundaries

### Rule 4: Documentation
- Each module has a README.md explaining its purpose
- Public API documented in index.ts

## Verification Checklist

After each module refactoring:
- [ ] All existing tests pass
- [ ] No import cycles
- [ ] TypeScript compiles without errors
- [ ] Module can be imported independently
- [ ] No duplicate code between modules

## Rollback Strategy

If a module refactoring breaks something:
1. Revert the module's index.ts to re-export from old location
2. Update admin page imports back to old paths
3. Delete new module files
4. Old code remains untouched throughout

## Timeline Estimate

| Phase | Steps | Estimated Time |
|-------|-------|----------------|
| Phase 1: Auth Module | Step 1 | 1-2 hours |
| Phase 2: Listings Module | Step 2 | 1-2 hours |
| Phase 3: Users Module | Step 3 | 1-2 hours |
| Phase 4: Leads Module | Step 4 | 1 hour |
| Phase 5: Content Module | Step 5 | 2-3 hours |
| Phase 6: Geo Module | Step 6 | 1-2 hours |
| Phase 7: Billing Module | Step 7 | 2-3 hours |
| Phase 8: Dashboard Module | Step 8 | 1-2 hours |
| **Total** | | **10-16 hours** |

## Success Metrics

1. **Code Organization**: Features grouped by domain, not file type
2. **Import Clarity**: Clear module boundaries via index.ts exports
3. **Testability**: Each module testable in isolation
4. **Maintainability**: Changes confined to relevant module
5. **Performance**: No regression in build/dev times

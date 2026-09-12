# Header & Footer Builder — Implementation Plan

## Overview

Build a drag-and-drop Header Builder and Footer Builder, modeled after the existing page builder system. Users can layout headers/footers using all existing block types PLUS specialized header/footer blocks (Logo, Menu, Social Icons, Contact Info, Search). Templates can be assigned globally, per page type, or per individual page.

---

## 1. Database Schema Changes

### New Prisma Model: `HeaderFooter`

```prisma
model HeaderFooter {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  type        String   // "HEADER" | "FOOTER"
  data        String?  // builder blocks JSON (Block[])
  isDefault   Boolean  @default(false)
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())
  @@unique([tenantId, name])
  @@index([tenantId, type])
}

model HeaderFooterRevision {
  id               String   @id @default(cuid())
  headerFooterId   String
  headerFooter     HeaderFooter @relation(fields: [headerFooterId], references: [id], onDelete: Cascade)
  data             String
  createdAt        DateTime @default(now())
  @@index([headerFooterId, createdAt])
}

model HeaderFooterAssignment {
  id               String   @id @default(cuid())
  tenantId         String
  headerFooterId   String
  headerFooter     HeaderFooter @relation(fields: [headerFooterId], references: [id], onDelete: Cascade)
  priority         Int      @default(0) // higher = more specific
  pageId           String?  // null = global or type-level
  pageType         String?  // null = global or page-level ("blog", "landing", "listing", etc.)
  createdAt        DateTime @default(now())
  @@unique([tenantId, headerFooterId, pageId, pageType])
  @@index([tenantId, type])
}
```

### Migration: Add `headerFooterId` to Page (optional per-page override)

```prisma
// Add to existing Page model
model Page {
  // ... existing fields ...
  headerFooterId  String?  // per-page override (null = use assignment rules)
}
```

---

## 2. New Specialized Block Types

### 2a. New Block Type Interfaces

```typescript
// --- HEADER/FOOTER SPECIALIZED BLOCKS ---

export interface LogoBlock extends BlockBase {
  type: "logo";
  props: {
    src: string;           // Logo image URL
    alt: string;           // Alt text
    linkTo: string;        // URL to link to (default: "/")
    width: number;         // Max width in px (default: 150)
    height: number;        // Max height in px (default: 50)
  };
}

export interface MenuBlock extends BlockBase {
  type: "menu";
  props: {
    menuId: string;        // Reference to Menu model
    orientation: "horizontal" | "vertical";
    style: "links" | "dropdown" | "hamburger";
    align: "left" | "center" | "right" | "between";
    gap: number;           // Space between items in px
    textColor?: string;
    hoverColor?: string;
    fontSize?: number;
    mobileMenuStyle: "slide" | "overlay" | "dropdown";
  };
}

export interface SocialIconsBlock extends BlockBase {
  type: "socialIcons";
  props: {
    icons: Array<{
      platform: string;    // "facebook" | "twitter" | "instagram" | "linkedin" | "youtube" | "pinterest" | "tiktok" | "github" | "custom"
      url: string;
      label: string;
      customIcon?: string; // SVG or icon class for custom
    }>;
    style: "filled" | "outlined" | "minimal";
    size: "sm" | "md" | "lg";
    color: string;
    hoverColor: string;
    gap: number;
  };
}

export interface ContactInfoBlock extends BlockBase {
  type: "contactInfo";
  props: {
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
    showHours: boolean;
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    separator: "dot" | "pipe" | "space" | "newline";
    iconStyle: "none" | "emoji" | "svg";
    textColor?: string;
    fontSize?: number;
  };
}

export interface SearchBlock extends BlockBase {
  type: "search";
  props: {
    placeholder: string;
    style: "minimal" | "expanded" | "icon-only";
    width: number;         // Max width in px
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    borderRadius: number;
  };
}

export interface SpacerBlock extends BlockBase {
  type: "spacer";
  props: { height: number };
}

export interface DividerBlock extends BlockBase {
  type: "divider";
  props: Record<string, never>;
}

export interface EmbedBlock extends BlockBase {
  type: "embed";
  props: { html: string };
}
```

### 2b. Updated Block Union Type

```typescript
export type HeaderFooterBlock =
  // All existing page builder blocks
  | HeroBlock | TextBlock | ImageBlock | CtaBlock | FeaturesBlock
  | ButtonBlock | EmbedBlock | FaqBlock | TestimonialBlock
  | SpacerBlock | DividerBlock | HeadingBlock | ListBlock
  | SliderBlock | ContentGridBlock
  | RowBlock | SectionBlock
  // New specialized header/footer blocks
  | LogoBlock | MenuBlock | SocialIconsBlock
  | ContactInfoBlock | SearchBlock;

export type HeaderFooterBlockType = HeaderFooterBlock["type"];
```

### 2c. New Block Definitions

```typescript
export const HEADER_FOOTER_BLOCK_DEFINITIONS: BlockDefinition[] = [
  // Specialized blocks (shown first in palette)
  { type: "logo",         label: "Logo",           icon: "◎", defaults: { src: "", alt: "Logo", linkTo: "/", width: 150, height: 50 } },
  { type: "menu",         label: "Navigation Menu", icon: "☰", defaults: { menuId: "", orientation: "horizontal", style: "links", align: "between", gap: 24, mobileMenuStyle: "hamburger" } },
  { type: "socialIcons",  label: "Social Icons",    icon: "⏹", defaults: { icons: [], style: "filled", size: "md", color: "#6b7280", hoverColor: "#111827", gap: 16 } },
  { type: "contactInfo",  label: "Contact Info",    icon: "📞", defaults: { showPhone: true, showEmail: true, showAddress: false, showHours: false, separator: "dot", iconStyle: "emoji" } },
  { type: "search",       label: "Search Bar",      icon: "🔍", defaults: { placeholder: "Search...", style: "icon-only", width: 300, borderRadius: 8 } },
  // All existing page builder blocks
  ...BLOCK_DEFINITIONS,
];
```

---

## 3. File Structure

```
apps/web/
├── lib/
│   └── header-footer/
│       ├── types.ts              ← NEW: HeaderFooter block types + definitions
│       ├── tree.ts               ← NEW: Tree operations (reuse page-builder/tree.ts)
│       └── renderer.ts           ← NEW: Server-side rendering for header/footer blocks
├── components/
│   └── admin/
│       └── header-footer-builder/
│           ├── HeaderFooterBuilder.tsx   ← NEW: Main orchestrator (similar to PageBuilder.tsx)
│           ├── HeaderFooterCanvas.tsx    ← NEW: Canvas (similar to BuilderCanvas.tsx)
│           ├── HeaderFooterPreview.tsx   ← NEW: Block preview (similar to BlockPreview.tsx)
│           ├── HeaderFooterEditor.tsx    ← NEW: Block editors (similar to BlockEditor.tsx)
│           ├── HeaderFooterPalette.tsx   ← NEW: Block palette (similar to BlockPalette.tsx)
│           ├── LogoBlock.tsx             ← NEW: Logo block renderer
│           ├── MenuBlock.tsx             ← NEW: Menu block renderer
│           ├── SocialIconsBlock.tsx      ← NEW: Social icons block renderer
│           ├── ContactInfoBlock.tsx      ← NEW: Contact info block renderer
│           └── SearchBlock.tsx           ← NEW: Search bar block renderer
├── app/(admin)/admin/
│   └── header-footer/
│       ├── page.tsx                     ← NEW: List all header/footer templates
│       ├── actions.ts                   ← NEW: Server actions
│       ├── new/page.tsx                 ← NEW: Create new template
│       └── [id]/edit/page.tsx           ← NEW: Edit template with builder
├── app/(site)/
│   └── layout.tsx                       ← MODIFY: Use HeaderFooter rendering
├── modules/
│   └── header-footer/
│       ├── index.ts                     ← NEW: Public module API
│       ├── types.ts                     ← NEW: Types
│       ├── queries.ts                   ← NEW: Database queries
│       └── actions.ts                   ← NEW: Server actions
└── packages/db/prisma/
    └── schema.prisma                    ← MODIFY: Add HeaderFooter models
```

---

## 4. Admin UI Structure

### 4a. Header/Footer Template List (`/admin/header-footer`)

- Table of all templates with columns: Name, Type (Header/Footer), Default badge, Last updated
- Actions: Edit, Set as Default, Delete
- "Create New Header" and "Create New Footer" buttons

### 4b. Template Edit Page (`/admin/header-footer/[id]/edit`)

- Same layout as page builder: canvas + sidebar
- Block palette shows: Logo, Menu, Social Icons, Contact Info, Search + all standard blocks
- Viewport toggle for responsive preview
- Autosave + revision history
- Assignment panel showing where this template is used

### 4c. Template Create Page (`/admin/header-footer/new`)

- Name input
- Type selector (Header/Footer)
- Start with blank canvas or from existing template

---

## 5. Assignment System

### 5a. Assignment Rules UI

In the template edit page, show an "Assignments" panel:

```typescript
interface AssignmentRule {
  id: string;
  type: "global" | "pageType" | "page";
  value?: string;    // page type slug or page ID
  priority: number;
}
```

**UI sections:**
1. **Global Default** — Toggle: "Use as default [header/footer] for all pages"
2. **Page Type Overrides** — Dropdown to select page type (blog, landing, listing, etc.) + assign template
3. **Page Overrides** — Search/select specific pages + assign template

### 5b. Resolution Logic (Server-side)

```typescript
async function resolveHeaderFooter(
  tenantId: string,
  type: "HEADER" | "FOOTER",
  context: {
    pageId?: string;
    pageType?: string;  // "blog" | "landing" | "listing" | etc.
  }
): Promise<HeaderFooter | null> {
  // 1. Check per-page assignment (highest priority)
  if (context.pageId) {
    const pageAssignment = await prisma.headerFooterAssignment.findFirst({
      where: { tenantId, headerFooter: { type }, pageId: context.pageId },
      include: { headerFooter: true },
      orderBy: { priority: "desc" },
    });
    if (pageAssignment) return pageAssignment.headerFooter;
  }

  // 2. Check per-page-type assignment
  if (context.pageType) {
    const typeAssignment = await prisma.headerFooterAssignment.findFirst({
      where: { tenantId, headerFooter: { type }, pageType: context.pageType },
      include: { headerFooter: true },
      orderBy: { priority: "desc" },
    });
    if (typeAssignment) return typeAssignment.headerFooter;
  }

  // 3. Fall back to global default
  const defaultTemplate = await prisma.headerFooter.findFirst({
    where: { tenantId, type, isDefault: true },
  });
  return defaultTemplate;
}
```

---

## 6. Site Layout Integration

### 6a. New Layout Architecture

Replace the hardcoded header/footer in `app/(site)/layout.tsx`:

```typescript
// Current (hardcoded):
<header>...</header>
<main>{children}</main>
<footer>...</footer>

// New (dynamic):
const headerTemplate = await resolveHeaderFooter(TENANT_ID, "HEADER", { pageId, pageType });
const footerTemplate = await resolveHeaderFooter(TENANT_ID, "FOOTER", { pageId, pageType });

const headerBlocks = headerTemplate?.data ? JSON.parse(headerTemplate.data) : DEFAULT_HEADER_BLOCKS;
const footerBlocks = footerTemplate?.data ? JSON.parse(footerTemplate.data) : DEFAULT_HEADER_BLOCKS;

<div className="min-h-full flex flex-col">
  <style>...</style>
  <HeaderRenderer blocks={headerBlocks} />
  <main>{children}</main>
  <FooterRenderer blocks={footerBlocks} />
</div>
```

### 6b. Default Blocks (Fallback)

When no template is assigned, use sensible defaults:

```typescript
const DEFAULT_HEADER_BLOCKS: HeaderFooterBlock[] = [
  {
    id: "default-header-row",
    type: "row",
    props: {
      columns: [
        { id: "logo-col", span: 3, blocks: [{ id: "default-logo", type: "logo", props: { src: "", alt: "Logo", linkTo: "/", width: 150, height: 50 } }] },
        { id: "menu-col", span: 9, blocks: [{ id: "default-menu", type: "menu", props: { menuId: "header", orientation: "horizontal", style: "links", align: "right", gap: 24, mobileMenuStyle: "hamburger" } }] },
      ],
      gap: 24, align: "center", stackOnMobile: true, paddingY: 16, fullWidth: false,
    },
  },
];
```

---

## 7. Block Rendering (Public)

### 7a. New Specialized Block Renderers

**LogoBlock Renderer:**
```tsx
function LogoBlockRenderer({ block }) {
  const { src, alt, linkTo, width, height } = block.props;
  return (
    <Link href={linkTo}>
      {src ? (
        <img src={src} alt={alt} style={{ maxWidth: width, maxHeight: height }} />
      ) : (
        <span className="text-lg font-bold">Logo</span>
      )}
    </Link>
  );
}
```

**MenuBlock Renderer:**
```tsx
function MenuBlockRenderer({ block }) {
  const { menuId, orientation, style, align, gap, mobileMenuStyle } = block.props;
  // Fetch menu items from DB
  const menu = await getMenuById(menuId);
  // Render horizontal/vertical, links/dropdown/hamburger
  // Include mobile hamburger menu with slide/overlay/dropdown
}
```

**SocialIconsBlock Renderer:**
```tsx
function SocialIconsBlockRenderer({ block }) {
  const { icons, style, size, color, hoverColor, gap } = block.props;
  return (
    <div style={{ display: "flex", gap }}>
      {icons.map(icon => (
        <a href={icon.url} target="_blank" rel="noopener noreferrer" aria-label={icon.label}>
          {/* Render platform-specific icon */}
        </a>
      ))}
    </div>
  );
}
```

**ContactInfoBlock Renderer:**
```tsx
function ContactInfoBlockRenderer({ block }) {
  const { showPhone, showEmail, showAddress, showHours, phone, email, address, hours, separator, iconStyle } = block.props;
  // Render contact details with appropriate separators and icons
}
```

**SearchBlock Renderer:**
```tsx
function SearchBlockRenderer({ block }) {
  const { placeholder, style, width, bgColor, borderColor, textColor, borderRadius } = block.props;
  return (
    <form action="/search" method="GET" style={{ maxWidth: width }}>
      <input type="search" name="q" placeholder={placeholder} style={{ ... }} />
    </form>
  );
}
```

### 7b. Reuse Existing Block Renderers

All existing `BlockRenderer.tsx` components can be reused directly since the block type interfaces are identical.

---

## 8. Navigation Updates

### Admin Sidebar

Add to the "System Tools" nav group:

```typescript
{ section: "headerFooter", href: "/admin/header-footer", label: "Header & Footer Builder" },
```

### Permissions

```typescript
headerFooter: ["SUPER_ADMIN", "ADMIN"],
```

---

## 9. Implementation Phases

### Phase 1: Database & Core Infrastructure
1. Add Prisma models (HeaderFooter, HeaderFooterRevision, HeaderFooterAssignment)
2. Create migration
3. Create `lib/header-footer/types.ts` with new block types
4. Create `modules/header-footer/` with queries and actions

### Phase 2: Builder Components
5. Create `HeaderFooterBuilder.tsx` (main orchestrator, adapted from PageBuilder.tsx)
6. Create `HeaderFooterCanvas.tsx` (canvas, adapted from BuilderCanvas.tsx)
7. Create `HeaderFooterPreview.tsx` (block previews)
8. Create `HeaderFooterEditor.tsx` (block editors)
9. Create `HeaderFooterPalette.tsx` (block palette with specialized blocks)

### Phase 3: Specialized Block Renderers
10. Create `LogoBlock.tsx` renderer
11. Create `MenuBlock.tsx` renderer (with mobile hamburger)
12. Create `SocialIconsBlock.tsx` renderer
13. Create `ContactInfoBlock.tsx` renderer
14. Create `SearchBlock.tsx` renderer

### Phase 4: Admin Pages
15. Create `/admin/header-footer` list page
16. Create `/admin/header-footer/new` create page
17. Create `/admin/header-footer/[id]/edit` edit page with builder
18. Add server actions for CRUD + assignments
19. Add assignment UI panel

### Phase 5: Site Integration
20. Modify `app/(site)/layout.tsx` to use dynamic header/footer
21. Implement resolution logic (global → page type → page)
22. Add default blocks fallback
23. Update navigation and permissions

### Phase 6: Polish
24. Add revision history support
25. Add responsive preview in builder
26. Test end-to-end flow
27. Add keyboard shortcuts and inline editing

---

## 10. Key Reuse Opportunities

| Existing Code | Reuse For | Adaptation Needed |
|---|---|---|
| `PageBuilder.tsx` | `HeaderFooterBuilder.tsx` | Swap block types, remove page-specific features (slug, status) |
| `BuilderCanvas.tsx` | `HeaderFooterCanvas.tsx` | Minimal changes, same DnD system |
| `BlockPreview.tsx` | `HeaderFooterPreview.tsx` | Add preview for specialized blocks |
| `BlockEditor.tsx` | `HeaderFooterEditor.tsx` | Add editors for specialized blocks |
| `BlockPalette.tsx` | `HeaderFooterPalette.tsx` | Show specialized blocks first |
| `tree.ts` | Header/footer tree ops | Can reuse directly (same block structure) |
| `spans.ts` | Column widths | Can reuse directly |
| `style.ts` | Per-block styles | Can reuse directly |
| `validate.ts` | Block validation | Add validation for specialized blocks |
| `BlockRenderer.tsx` | Public rendering | Add specialized block renderers |

---

## 11. File Count Estimate

- **New files:** ~20
- **Modified files:** ~5 (layout.tsx, permissions.ts, schema.prisma, admin layout, page-builder/types.ts)
- **Lines of code:** ~3000-4000 (heavy reuse of existing patterns)

---

## 12. Testing Strategy

1. **Unit tests:** Block type factories, tree operations, assignment resolution logic
2. **Integration tests:** Server actions (CRUD, assignments), template rendering
3. **E2E tests:** Builder flow (create template → add blocks → save → assign to page → verify rendering)
4. **Responsive tests:** Mobile hamburger menu, responsive column layouts
5. **Assignment tests:** Global → page type → page override resolution

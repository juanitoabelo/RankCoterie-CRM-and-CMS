/**
 * Database access for custom fonts. Kept apart from `custom-fonts.ts` so client
 * components can import the pure helpers without pulling in Prisma.
 */
import { prisma, TENANT_ID, MemoryCache } from "@/modules/shared";
import type { CustomFontFile } from "./custom-fonts";

type CustomFontRow = {
  id: string;
  family: string;
  weight: string;
  style: string;
  mono: boolean;
  mimeType: string;
  size: number;
  filename: string | null;
  createdAt: Date;
};

function toFile(row: CustomFontRow): CustomFontFile {
  return {
    id: row.id,
    family: row.family,
    weight: row.weight,
    style: row.style,
    mono: row.mono,
    mimeType: row.mimeType,
    size: row.size,
    filename: row.filename,
    createdAt: row.createdAt.toISOString(),
  };
}

const SELECT = {
  id: true,
  family: true,
  weight: true,
  style: true,
  mono: true,
  mimeType: true,
  size: true,
  filename: true,
  createdAt: true,
} as const;

/**
 * Short-lived cache: the root layout loads fonts on *every* page render (site
 * and admin), which used to cost two round-trips per navigation. The TTL is a
 * safety net — upload/delete endpoints call `invalidateFontCache()` for
 * instant freshness.
 */
const fontCache = new MemoryCache<CustomFontFile[]>(30_000);
const FONT_CACHE_KEY = "custom-fonts";

/** Every uploaded font file for the tenant, oldest family first. */
export async function loadCustomFonts(): Promise<CustomFontFile[]> {
  const cached = fontCache.get(FONT_CACHE_KEY);
  if (cached) return cached.slice();

  const rows = await prisma.customFont.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ family: "asc" }, { weight: "asc" }],
    select: SELECT,
  });
  const files = rows.map(toFile);
  fontCache.set(FONT_CACHE_KEY, files);
  return files.slice();
}

/** Drop the font cache — call whenever fonts are created, replaced or deleted. */
export function invalidateFontCache(): void {
  fontCache.delete(FONT_CACHE_KEY);
}

/**
 * Fonts for public page rendering. Never throws — a database blip must not take
 * the whole site down, it just means custom fonts are unavailable.
 */
export async function loadCustomFontsSafe(): Promise<CustomFontFile[]> {
  try {
    return await loadCustomFonts();
  } catch {
    return [];
  }
}

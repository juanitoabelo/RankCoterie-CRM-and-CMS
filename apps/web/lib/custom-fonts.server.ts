/**
 * Database access for custom fonts. Kept apart from `custom-fonts.ts` so client
 * components can import the pure helpers without pulling in Prisma.
 */
import { prisma } from "@/modules/shared";
import { TENANT_ID } from "@/modules/shared";
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

/** Every uploaded font file for the tenant, oldest family first. */
export async function loadCustomFonts(): Promise<CustomFontFile[]> {
  const rows = await prisma.customFont.findMany({
    where: { tenantId: TENANT_ID },
    orderBy: [{ family: "asc" }, { weight: "asc" }],
    select: SELECT,
  });
  return rows.map(toFile);
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

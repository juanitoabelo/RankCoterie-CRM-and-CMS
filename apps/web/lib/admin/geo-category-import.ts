/**
 * Rank Coterie — GeoCategory bulk-import parsing & validation (pure).
 *
 * Column contract mirrors the GeoCategory editor plus the legacy
 * tblSearchCategory* fields the Canopy importer carried (DomainKey → slug,
 * Title, Description, Author, StateInit/StateDesc/CityInit/CityDesc).
 * Server actions feed this a cell matrix (from CSV or XLSX), an
 * `updateExisting` flag and the set of slugs that already exist in the DB.
 */

export const MAX_IMPORT_ROWS = 1000;

export type GeoImportColumnKey =
  | "title"
  | "slug"
  | "author"
  | "description"
  | "stateInit"
  | "stateDesc"
  | "cityInit"
  | "cityDesc"
  | "parentImageAssetId"
  | "stateImageAssetId"
  | "cityImageAssetId"
  | "status"
  | "seoTitle"
  | "metaDesc"
  | "metaKeywords"
  | "focusKeyphrase"
  | "canonicalUrl"
  | "ogImage";

export interface GeoImportColumn {
  key: GeoImportColumnKey;
  /** Canonical header shown in the template + docs. */
  header: string;
  /** Extra header spellings accepted from legacy exports. */
  aliases?: string[];
  required?: boolean;
  /** Human description for the docs table. */
  note: string;
  /** Short format hint for the docs table. */
  format?: string;
}

export const GEO_IMPORT_COLUMNS: GeoImportColumn[] = [
  { key: "title", header: "Title", aliases: ["Category Title", "Name"], required: true, note: "GeoCategory title.", format: "Text (required)" },
  { key: "slug", header: "Slug", aliases: ["URL Slug", "Domain Key", "Path"], note: "URL slug under /g/{slug}/. Blank = slugified title.", format: "a-z, 0-9, hyphens" },
  { key: "author", header: "Author", aliases: ["Category Author"], note: "Topic author byline.", format: "Text" },
  { key: "description", header: "Description", aliases: ["Category Description"], note: "Category-level description; {{tokens}} allowed.", format: "Text / HTML" },
  { key: "stateInit", header: "State Intro", aliases: ["State Init", "State Introduction"], note: "Intro shown on state pages; {{region}} tokens allowed.", format: "Text" },
  { key: "stateDesc", header: "State Description", aliases: ["StateDesc", "State Desc"], note: "State page body copy.", format: "Text" },
  { key: "cityInit", header: "City Intro", aliases: ["City Init", "City Introduction"], note: "Intro shown on city pages; {{region}} tokens allowed.", format: "Text" },
  { key: "cityDesc", header: "City Description", aliases: ["CityDesc", "City Desc"], note: "City page body copy.", format: "Text" },
  { key: "parentImageAssetId", header: "Parent Image", aliases: ["ParentImage", "parent image", "Primary Image", "primary image"], note: "Parent page image from the Media Library. Blank leaves an existing image untouched.", format: "asset ID or /api/assets/…" },
  { key: "stateImageAssetId", header: "State Image", aliases: ["StateImage", "state image"], note: "State page image from the Media Library.", format: "asset ID or /api/assets/…" },
  { key: "cityImageAssetId", header: "City Image", aliases: ["CityImage", "city image"], note: "City page image from the Media Library.", format: "asset ID or /api/assets/…" },
  { key: "status", header: "Status", note: "LIVE, DRAFT or HIDDEN. Blank = LIVE on create; blank leaves status unchanged on update.", format: "LIVE / DRAFT / HIDDEN" },
  { key: "seoTitle", header: "SEO Title", aliases: ["SeoTitle"], note: "SEO title override; {{tokens}} allowed.", format: "Text" },
  { key: "metaDesc", header: "Meta Description", aliases: ["MetaDesc", "Meta Desc"], note: "Meta description; {{tokens}} allowed.", format: "Text" },
  { key: "metaKeywords", header: "Meta Keywords", aliases: ["Keywords", "MetaKeywords"], note: "Comma/semicolon list or a JSON array.", format: "kw one, kw two" },
  { key: "focusKeyphrase", header: "Focus Keyphrase", aliases: ["FocusKeyphrase", "Focus Keyword", "Keyphrase"], note: "SEO focus keyphrase.", format: "Text" },
  { key: "canonicalUrl", header: "Canonical URL", aliases: ["CanonicalUrl", "Canonical"], note: "Canonical for the parent /g/{slug}/ page.", format: "https://… or /path" },
  { key: "ogImage", header: "OG Image", aliases: ["OgImage", "og image", "OG Image URL"], note: "Open Graph / social-share image URL for the parent page.", format: "https://… or /path" },
];

/** Image columns carry Media Library asset IDs (raw, or as an /api/assets/… URL). */
export const GEO_IMPORT_IMAGE_KEYS = [
  "parentImageAssetId",
  "stateImageAssetId",
  "cityImageAssetId",
] as const satisfies readonly GeoImportColumnKey[];

const IMAGE_LABEL: Record<(typeof GEO_IMPORT_IMAGE_KEYS)[number], string> = {
  parentImageAssetId: "Parent Image",
  stateImageAssetId: "State Image",
  cityImageAssetId: "City Image",
};

/** CategoryImage.position for each import image column (mirrors the editor). */
export const IMAGE_POSITION: Record<(typeof GEO_IMPORT_IMAGE_KEYS)[number], string> = {
  parentImageAssetId: "PRIMARY",
  stateImageAssetId: "STATE",
  cityImageAssetId: "CITY",
};

/** "…/api/assets/abc123" → "abc123"; anything else passes through as a raw asset ID. */
export function extractAssetId(raw: string): string {
  const v = raw.trim();
  const match = /^\/api\/assets\/([A-Za-z0-9_-]+)\/?$/.exec(v);
  return match ? match[1] : v;
}

const STATUS_VALUES = ["LIVE", "DRAFT", "HIDDEN"] as const;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Normalize a header cell into a match key: "Focus-Keyphrase" → "focus keyphrase". */
export function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Legacy-tolerant slugify: accents stripped, everything else → hyphens. */
export function slugifySlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type GeoImportAction = "create" | "update" | "skip";

export interface GeoImportRow {
  /** Sheet row number (header = row 1, first data row = 2). */
  row: number;
  title: string;
  slug: string;
  action: GeoImportAction;
  errors: string[];
  /** Normalized cell values; null = blank cell. */
  values: Partial<Record<GeoImportColumnKey, string | null>>;
}

export type GeoImportParseResult =
  | { ok: true; rows: GeoImportRow[]; ignoredColumns: string[] }
  | { ok: false; error: string };

export interface GeoImportOptions {
  /** When true an existing slug becomes an "update"; otherwise "skip". */
  updateExisting: boolean;
  /** Slugs already present for this tenant. */
  existingSlugs: Set<string>;
  /**
   * Media Library asset IDs that exist for this tenant. When provided, any
   * non-blank image cell must resolve to one of them; when omitted, image
   * cells are passed through unvalidated (pure/offline contexts).
   */
  knownAssetIds?: Set<string>;
}

function buildHeaderMap(headerRow: string[]): {
  indexOf: Partial<Record<GeoImportColumnKey, number>>;
  ignored: string[];
} {
  const lookup = new Map<string, GeoImportColumnKey>();
  for (const col of GEO_IMPORT_COLUMNS) {
    lookup.set(normalizeHeader(col.header), col.key);
    for (const alias of col.aliases ?? []) lookup.set(normalizeHeader(alias), col.key);
  }
  const indexOf: Partial<Record<GeoImportColumnKey, number>> = {};
  const ignored: string[] = [];
  headerRow.forEach((raw, i) => {
    const header = normalizeHeader(raw);
    if (!header) return;
    const key = lookup.get(header);
    if (key && indexOf[key] === undefined) indexOf[key] = i;
    else if (!key) ignored.push(raw.trim());
  });
  return { indexOf, ignored };
}

/** Comma/semicolon list or JSON array → JSON array string; undefined when blank. */
function normalizeKeywords(raw: string): { value?: string; error?: string } {
  const v = raw.trim();
  if (!v) return {};
  if (v.startsWith("[")) {
    try {
      const parsed = JSON.parse(v);
      if (!Array.isArray(parsed)) return { error: "Meta Keywords: JSON must be an array." };
      return { value: JSON.stringify(parsed.map(String)) };
    } catch {
      return { error: "Meta Keywords: invalid JSON array." };
    }
  }
  const list = v
    .split(/[;,]/)
    .map((k) => k.trim())
    .filter(Boolean);
  if (!list.length) return { value: undefined };
  return { value: JSON.stringify(list) };
}

function cellAt(row: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return (row[index] ?? "").trim();
}

/**
 * Parse a cell matrix (row 0 = header) into validated import rows.
 * Blank rows are dropped; row numbers keep their original sheet positions.
 */
export function parseGeoCategoryImport(
  matrix: string[][],
  opts: GeoImportOptions,
): GeoImportParseResult {
  if (!matrix.length) return { ok: false, error: "The file is empty." };

  const { indexOf, ignored } = buildHeaderMap(matrix[0]);
  if (indexOf.title === undefined) {
    return {
      ok: false,
      error:
        'Could not find a "Title" column in the header row. Download the CSV template to see the expected columns.',
    };
  }

  const dataRows = matrix
    .map((cells, i) => ({ cells, sheetRow: i + 1 }))
    .filter(({ cells }) => cells.some((c) => c.trim() !== ""));
  const data = dataRows.filter(({ sheetRow }) => sheetRow > 1);

  if (!data.length) return { ok: false, error: "No data rows found below the header row." };
  if (data.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Too many rows (${data.length.toLocaleString()}). The limit is ${MAX_IMPORT_ROWS.toLocaleString()} rows per import — please split the file.`,
    };
  }

  const seenSlugs = new Map<string, number>();
  const rows: GeoImportRow[] = [];

  for (const { cells, sheetRow } of data) {
    const title = cellAt(cells, indexOf.title);
    const values: GeoImportRow["values"] = {};
    for (const col of GEO_IMPORT_COLUMNS) {
      const idx = indexOf[col.key];
      if (idx === undefined) continue;
      const raw = (cells[idx] ?? "").trim();
      values[col.key] = raw === "" ? null : raw;
    }

    const errors: string[] = [];
    if (!title) errors.push("Title is required.");

    const rawSlug = values.slug ?? "";
    const slug = slugifySlug(rawSlug || title);
    if (!slug) {
      if (title) errors.push('Slug is empty — provide a slug or a title that slugifies to one.');
    } else if (!SLUG_RE.test(slug)) {
      errors.push(`Slug "${slug}" is invalid — use lowercase letters, numbers and hyphens.`);
    }

    let status = values.status ?? null;
    if (status) {
      status = status.toUpperCase();
      if (!(STATUS_VALUES as readonly string[]).includes(status)) {
        errors.push(`Status "${status}" must be LIVE, DRAFT or HIDDEN.`);
        status = null;
      }
    }
    values.status = status;

    const keywords = normalizeKeywords(values.metaKeywords ?? "");
    if (keywords.error) errors.push(keywords.error);
    values.metaKeywords = keywords.error ? null : (keywords.value ?? null);

    const canonical = values.canonicalUrl ?? null;
    if (canonical && !/^(https?:\/\/|\/)/i.test(canonical)) {
      errors.push('Canonical URL must start with http://, https:// or /.');
    }

    const ogImage = values.ogImage ?? null;
    if (ogImage && !/^(https?:\/\/|\/)/i.test(ogImage)) {
      errors.push('OG Image must start with http://, https:// or /.');
    }

    for (const key of GEO_IMPORT_IMAGE_KEYS) {
      const raw = values[key];
      if (raw === null || raw === undefined) continue;
      const assetId = extractAssetId(raw);
      values[key] = assetId;
      if (opts.knownAssetIds && !opts.knownAssetIds.has(assetId)) {
        errors.push(
          `${IMAGE_LABEL[key]} "${raw}" was not found in the Media Library — use an asset ID or an /api/assets/… URL.`,
        );
      }
    }

    if (slug) {
      const prev = seenSlugs.get(slug);
      if (prev !== undefined) errors.push(`Duplicate slug "${slug}" (also on row ${prev}).`);
      else seenSlugs.set(slug, sheetRow);
    }

    let action: GeoImportAction = "create";
    if (slug && opts.existingSlugs.has(slug)) {
      action = opts.updateExisting ? "update" : "skip";
    }

    rows.push({ row: sheetRow, title, slug, action, errors, values });
  }

  return { ok: true, rows, ignoredColumns: ignored };
}

/** Summary chips for the preview UI. */
export function summarizeImportRows(rows: GeoImportRow[]): {
  total: number;
  create: number;
  update: number;
  skip: number;
  error: number;
} {
  const summary = { total: rows.length, create: 0, update: 0, skip: 0, error: 0 };
  for (const r of rows) {
    if (r.errors.length) summary.error++;
    else summary[r.action]++;
  }
  return summary;
}

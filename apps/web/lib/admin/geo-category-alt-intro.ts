export const GEO_AREA_LABELS: Record<string, string> = {
  NORTHERN: "Northern",
  SOUTHERN: "Southern",
  EASTERN: "Eastern",
  WESTERN: "Western",
  CENTRAL: "Central",
};

export const MIN_ALT_INTRO_WORDS = 150;

const AREA_FOCUS: Record<string, string> = {
  NORTHERN: "northern suburbs and nearby communities",
  SOUTHERN: "southern suburbs and nearby communities",
  EASTERN: "eastern suburbs and nearby communities",
  WESTERN: "western suburbs and nearby communities",
  CENTRAL: "central neighbourhoods and surrounding areas",
};

export interface AlternateIntroInput {
  areaPart: string;
  stateName?: string;
  parentContentHtml?: string | null;
  stateIntroHtml?: string | null;
  stateStaticHtml?: string | null;
  cityIntroHtml?: string | null;
  cityStaticHtml?: string | null;
  minWords?: number;
}

export interface AlternateIntroResult {
  html: string;
  wordCount: number;
  meetsMinimum: boolean;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlToParagraphs(html: string | null | undefined): string[] {
  const text = decodeEntities(
    (html ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|section)>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  );

  return text
    .split("\n")
    .map((paragraph) => paragraph.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

function uniqueParagraphs(paragraphs: string[]): string[] {
  const seen = new Set<string>();
  return paragraphs.filter((paragraph) => {
    const key = paragraph.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length < 2) return items;
  const index = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(index), ...items.slice(0, index)];
}

export function countWordsFromHtml(html: string | null | undefined): number {
  const text = htmlToParagraphs(html).join(" ");
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function generateAlternateIntro(input: AlternateIntroInput): AlternateIntroResult {
  const {
    areaPart,
    stateName,
    parentContentHtml,
    stateIntroHtml,
    stateStaticHtml,
    cityIntroHtml,
    cityStaticHtml,
    minWords = MIN_ALT_INTRO_WORDS,
  } = input;

  const sourceParagraphs = uniqueParagraphs(
    [
      ...htmlToParagraphs(cityIntroHtml),
      ...htmlToParagraphs(parentContentHtml),
      ...htmlToParagraphs(stateIntroHtml),
      ...htmlToParagraphs(cityStaticHtml),
      ...htmlToParagraphs(stateStaticHtml),
    ].map((paragraph) => paragraph.trim()),
  );

  if (!sourceParagraphs.length) {
    return { html: "", wordCount: 0, meetsMinimum: false };
  }

  const label = GEO_AREA_LABELS[areaPart] ?? (areaPart ? areaPart.toLowerCase() : "");
  const statePhrase = stateName ? ` in ${stateName}` : "";
  const areaFocus = AREA_FOCUS[areaPart] ?? (label ? `${label.toLowerCase()} area` : "local area");
  const areaContext = label
    ? `${label.toLowerCase()} ${stateName ? `${stateName} ` : ""}{{region}} area`
    : `${stateName ? `${stateName} ` : ""}{{region}} area`;
  const areaOffset = Object.keys(GEO_AREA_LABELS).indexOf(areaPart);
  const orderedParagraphs = rotate(sourceParagraphs, areaOffset < 0 ? 0 : areaOffset);

  const opening = label
    ? `Serving the ${label.toLowerCase()} area of {{region}}${statePhrase}, this {{catName}} guide brings together the most relevant information for people searching {{in region}}.`
    : `This {{catName}} guide for {{region}}${statePhrase} brings together the most relevant information for people searching {{in region}}.`;

  const focus = `The details below are written for visitors exploring ${areaFocus} across {{region}}${statePhrase}, including those comparing options {{near region}}, researching services {{around region}}, or looking for {{catName}} {{from region}}.`;

  const closing = `For people looking for {{catName}} {{in region}}, this content keeps the focus on what matters in the ${areaContext}, from practical details to the next steps that fit the area served.`;

  const body = orderedParagraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const html = `<p>${escapeHtml(opening)}</p>${body}<p>${escapeHtml(focus)}</p><p>${escapeHtml(closing)}</p>`;
  const wordCount = countWordsFromHtml(html);

  return {
    html,
    wordCount,
    meetsMinimum: wordCount >= minWords,
  };
}

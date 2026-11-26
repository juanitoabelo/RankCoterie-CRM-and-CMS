import { GEO_AREA_LABELS, MIN_ALT_INTRO_WORDS } from "./geo-category-alt-intro";

const FORBIDDEN_PHRASES = [
  "main geocategory page",
  "parent geocategory page",
  "use this page alongside",
  "full overview",
];

const REQUIRED_TOKENS = ["{{region}}", "{{catName}}"];

export interface AiAlternateIntroInput {
  areaPart: string;
  stateName?: string;
  parentContentHtml?: string | null;
  stateIntroHtml?: string | null;
  stateStaticHtml?: string | null;
  cityIntroHtml?: string | null;
  cityStaticHtml?: string | null;
}

export interface AiAlternateIntroPrompt {
  system: string;
  user: string;
}

export interface AiAlternateIntroOutput {
  html: string;
  wordCount: number;
}

export type AiAlternateIntroValidation =
  | { ok: true; output: AiAlternateIntroOutput }
  | { ok: false; error: string };

export type AiAlternateIntroResult =
  | { ok: true; html: string; wordCount: number }
  | { ok: false; error: string };

export type AiAlternateIntroInputValidation =
  | { ok: true; input: AiAlternateIntroInput }
  | { ok: false; error: string };

const MAX_SOURCE_FIELD_LENGTH = 20000;
const MAX_STATE_NAME_LENGTH = 120;

function readSourceField(
  record: Record<string, unknown>,
  key: keyof AiAlternateIntroInput,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error(`${key} must be text.`);
  return value.slice(0, MAX_SOURCE_FIELD_LENGTH);
}

export function validateAiAlternateIntroInput(value: unknown): AiAlternateIntroInputValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Invalid AI generation request." };
  }

  const record = value as Record<string, unknown>;
  const areaPart = record.areaPart;
  if (
    typeof areaPart !== "string" ||
    !Object.prototype.hasOwnProperty.call(GEO_AREA_LABELS, areaPart)
  ) {
    return { ok: false, error: "Choose a valid geographical area." };
  }

  const rawStateName = record.stateName;
  if (
    rawStateName !== undefined &&
    rawStateName !== null &&
    (typeof rawStateName !== "string" || rawStateName.length > MAX_STATE_NAME_LENGTH)
  ) {
    return { ok: false, error: "Invalid state name." };
  }

  let fields: Record<
    "parentContentHtml" | "stateIntroHtml" | "stateStaticHtml" | "cityIntroHtml" | "cityStaticHtml",
    string | undefined
  >;
  try {
    fields = {
      parentContentHtml: readSourceField(record, "parentContentHtml"),
      stateIntroHtml: readSourceField(record, "stateIntroHtml"),
      stateStaticHtml: readSourceField(record, "stateStaticHtml"),
      cityIntroHtml: readSourceField(record, "cityIntroHtml"),
      cityStaticHtml: readSourceField(record, "cityStaticHtml"),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid AI generation request.",
    };
  }

  const hasSource = Object.values(fields).some((field) => Boolean(field?.trim()));
  if (!hasSource) {
    return { ok: false, error: "Add Parent, State, or City content before generating copy." };
  }

  return {
    ok: true,
    input: {
      areaPart,
      stateName: typeof rawStateName === "string" ? rawStateName.trim() : undefined,
      ...fields,
    },
  };
}

function htmlToPlainText(html: string | null | undefined): string {
  return (html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|section)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 20000);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainTextToHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function buildAiAlternateIntroPrompt(input: AiAlternateIntroInput): AiAlternateIntroPrompt {
  const areaLabel = GEO_AREA_LABELS[input.areaPart] ?? input.areaPart ?? "Local";
  const sourceText = [
    input.cityIntroHtml && `City intro:\n${htmlToPlainText(input.cityIntroHtml)}`,
    input.parentContentHtml && `Parent page content:\n${htmlToPlainText(input.parentContentHtml)}`,
    input.stateIntroHtml && `State intro:\n${htmlToPlainText(input.stateIntroHtml)}`,
    input.cityStaticHtml && `City static content:\n${htmlToPlainText(input.cityStaticHtml)}`,
    input.stateStaticHtml && `State static content:\n${htmlToPlainText(input.stateStaticHtml)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    system: [
      "You write natural, useful local landing-page copy for a directory website.",
      "Use only the ideas and facts present in the supplied source content. Do not invent facts, prices, availability, credentials, reviews, or claims.",
      "Never mention a CMS, an admin page, a parent page, a main GeoCategory page, a prompt, or that the copy was generated.",
      `Write at least ${MIN_ALT_INTRO_WORDS} words, aiming for 180 to 260 words so it reads naturally to a person.`,
      "Write 2 to 4 short paragraphs of plain prose. No headings, no bullet points, no markdown, no HTML.",
      "Preserve these tokens exactly wherever they fit naturally: {{region}}, {{in region}}, {{around region}}, {{near region}}, {{of region}}, {{from region}}, {{in the region area}}, {{from the region area}}, {{regionurlpart}}, {{region2inject}}, {{catName}}, {{in catName}}, {{subcat}}, {{subcattext}}.",
      "Include {{region}} and {{catName}} at least once. Do not replace tokens with hardcoded place names.",
    ].join(" "),
    user: [
      `Write a unique alternate intro for city pages in ${input.stateName || "the selected state"} within the ${areaLabel} geographical area.`,
      "{{region}} will be replaced with the actual city name when the page renders, so write for a generic city using tokens.",
      "The copy must stay focused on the topic of the source content below and be useful to someone searching locally.",
      "",
      "Source content:",
      sourceText || "No source content supplied.",
    ].join("\n"),
  };
}

export function normalizeAiAlternateIntro(rawText: string): AiAlternateIntroOutput {
  const text = rawText.trim();
  const html = plainTextToHtml(text);
  return { html, wordCount: countWords(text) };
}

export function validateAiAlternateIntro(rawText: string): AiAlternateIntroValidation {
  const text = rawText.trim();
  if (!text) return { ok: false, error: "AI returned an empty response." };

  const lower = text.toLowerCase();
  const forbidden = FORBIDDEN_PHRASES.find((phrase) => lower.includes(phrase));
  if (forbidden) {
    return { ok: false, error: "AI copy mentioned admin/parent-page language. Rewrite without that wording." };
  }

  const missing = REQUIRED_TOKENS.filter((token) => !text.includes(token));
  if (missing.length) {
    return { ok: false, error: `AI copy is missing required tokens: ${missing.join(", ")}.` };
  }

  const output = normalizeAiAlternateIntro(text);
  if (output.wordCount < MIN_ALT_INTRO_WORDS) {
    return {
      ok: false,
      error: `AI copy is only ${output.wordCount} words. Rewrite with at least ${MIN_ALT_INTRO_WORDS} words.`,
    };
  }

  return { ok: true, output };
}

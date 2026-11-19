export interface DealTemplateLineItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface DealTemplateDefaults {
  title: string;
  value: number;
  currency: string;
  stageKey: string;
  probability: number | null;
  expectedCloseDate: string;
  source: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  lineItems: DealTemplateLineItem[];
}

export const EMPTY_DEAL_TEMPLATE_DEFAULTS: DealTemplateDefaults = {
  title: "",
  value: 0,
  currency: "USD",
  stageKey: "",
  probability: null,
  expectedCloseDate: "",
  source: "",
  companyName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  notes: "",
  lineItems: [],
};

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function number(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function normalizeDealTemplateDefaults(value: unknown): DealTemplateDefaults {
  if (!value || typeof value !== "object") return { ...EMPTY_DEAL_TEMPLATE_DEFAULTS, lineItems: [] };
  const raw = value as Record<string, unknown>;
  const rawLineItems = Array.isArray(raw.lineItems) ? raw.lineItems.slice(0, 20) : [];
  const probability = raw.probability === null || raw.probability === undefined || raw.probability === ""
    ? null
    : number(raw.probability, 0, 0, 100);

  return {
    title: text(raw.title, 200),
    value: number(raw.value, 0, 0, 100_000_000),
    currency: text(raw.currency, 3).toUpperCase() || "USD",
    stageKey: text(raw.stageKey, 80).toLowerCase(),
    probability,
    expectedCloseDate: text(raw.expectedCloseDate, 10),
    source: text(raw.source, 80),
    companyName: text(raw.companyName, 200),
    contactName: text(raw.contactName, 200),
    contactEmail: text(raw.contactEmail, 200).toLowerCase(),
    contactPhone: text(raw.contactPhone, 50),
    notes: text(raw.notes, 5000),
    lineItems: rawLineItems.flatMap((item): DealTemplateLineItem[] => {
      if (!item || typeof item !== "object") return [];
      const line = item as Record<string, unknown>;
      const name = text(line.name, 200);
      if (!name) return [];
      return [{
        name,
        quantity: Math.round(number(line.quantity, 1, 1, 9999)),
        unitPrice: number(line.unitPrice, 0, 0, 1_000_000),
      }];
    }),
  };
}

export function mergeDealTemplateDefaults(
  defaults: DealTemplateDefaults,
  overrides: Partial<DealTemplateDefaults>,
): DealTemplateDefaults {
  const pick = <K extends keyof DealTemplateDefaults>(key: K): DealTemplateDefaults[K] => {
    const value = overrides[key];
    if (value === undefined || (typeof value === "string" && value.trim() === "")) {
      return defaults[key];
    }
    return value;
  };

  return {
    title: pick("title"),
    value: pick("value"),
    currency: pick("currency"),
    stageKey: pick("stageKey"),
    probability: pick("probability"),
    expectedCloseDate: pick("expectedCloseDate"),
    source: pick("source"),
    companyName: pick("companyName"),
    contactName: pick("contactName"),
    contactEmail: pick("contactEmail"),
    contactPhone: pick("contactPhone"),
    notes: pick("notes"),
    lineItems: Array.isArray(overrides.lineItems) ? overrides.lineItems : defaults.lineItems,
  };
}

export function isValidPipelineKey(value: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,79}$/.test(value);
}

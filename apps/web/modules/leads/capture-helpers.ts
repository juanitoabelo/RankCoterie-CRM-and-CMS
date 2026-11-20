export type LeadDedupeMode = "none" | "email" | "emailOrPhone";

export interface LeadCaptureInput {
  tenantId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  subject?: string;
  message?: string;
  source?: string;
  listingId?: string | null;
  formId?: string | null;
  submissionId?: string | null;
  dedupeMode?: LeadDedupeMode;
  assignedToId?: string | null;
  intakeExtras?: Record<string, unknown>;
}

export interface NormalizedLeadCapture {
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneDigits: string;
  company: string;
  subject: string;
  message: string;
  source: string;
  listingId: string | null;
  formId: string | null;
  submissionId: string | null;
  dedupeMode: LeadDedupeMode;
  assignedToId: string | null;
  dedupeKeys: string[];
  intakeExtras: Record<string, unknown>;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalId(value: unknown): string | null {
  const parsed = text(value);
  return parsed || null;
}

function normalizeIntakeExtras(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entry]) => {
      if (!key || key.length > 80) return [];
      if (entry === null || typeof entry === "boolean") return [[key, entry]];
      if (typeof entry === "number") return Number.isFinite(entry) ? [[key, entry]] : [];
      if (typeof entry === "string") return [[key, entry.slice(0, 4000)]];
      return [];
    }),
  );
}

export function normalizeLeadCapture(input: LeadCaptureInput): NormalizedLeadCapture {
  const explicitFirst = text(input.firstName);
  const explicitLast = text(input.lastName);
  const fullName = text(input.name);
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = explicitFirst || nameParts[0] || "";
  const lastName = explicitLast || nameParts.slice(1).join(" ");
  const email = text(input.email).toLowerCase();
  const phone = text(input.phone);
  const phoneDigits = phone.replace(/\D/g, "");
  const source = text(input.source) || "website";
  const dedupeMode: LeadDedupeMode =
    input.dedupeMode === "none" || input.dedupeMode === "emailOrPhone"
      ? input.dedupeMode
      : "email";

  const dedupeKeys: string[] = [];
  if (email) dedupeKeys.push(email);
  if (dedupeMode === "emailOrPhone" && phoneDigits && !dedupeKeys.includes(phoneDigits)) {
    dedupeKeys.push(phoneDigits);
  }

  return {
    tenantId: text(input.tenantId),
    firstName,
    lastName,
    email,
    phone,
    phoneDigits,
    company: text(input.company),
    subject: text(input.subject),
    message: text(input.message),
    source,
    listingId: optionalId(input.listingId),
    formId: optionalId(input.formId),
    submissionId: optionalId(input.submissionId),
    dedupeMode,
    assignedToId: optionalId(input.assignedToId),
    dedupeKeys,
    intakeExtras: normalizeIntakeExtras(input.intakeExtras),
  };
}

export function leadDedupeWhere(input: NormalizedLeadCapture): Record<string, unknown> | null {
  if (input.dedupeMode === "none") return null;
  if (!input.tenantId) return null;

  const matches: Record<string, unknown>[] = [];
  if (input.email) {
    matches.push({ email: { equals: input.email, mode: "insensitive" } });
    matches.push({ intake: { path: ["dedupeEmails"], array_contains: input.email } });
  }

  if (input.dedupeMode === "email") {
    if (!matches.length) return null;
    return matches.length === 1
      ? { tenantId: input.tenantId, ...matches[0] }
      : { tenantId: input.tenantId, OR: matches };
  }

  if (input.phone) {
    matches.push({ phones: { string_contains: input.phone } });
  }
  if (input.phoneDigits) {
    matches.push({ phones: { string_contains: input.phoneDigits } });
    matches.push({ intake: { path: ["dedupePhones"], array_contains: input.phoneDigits } });
  }
  if (!matches.length) return null;
  if (matches.length === 1) return { tenantId: input.tenantId, ...matches[0] };
  return { tenantId: input.tenantId, OR: matches };
}

export interface ExistingCaptureLead {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phones: unknown;
}

export function mergeCapturedLeadData(
  existing: ExistingCaptureLead,
  input: NormalizedLeadCapture,
): {
  firstName: string;
  lastName: string;
  email: string;
  phones: Array<{ number: string; kind: string; digits?: string }>;
} {
  const phones = Array.isArray(existing.phones)
    ? existing.phones.flatMap((value): Array<{ number: string; kind: string; digits?: string }> => {
      if (typeof value === "string" && value) {
        return [{ number: value, kind: "unknown", digits: value.replace(/\D/g, "") || undefined }];
      }
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      const number = typeof row.number === "string" ? row.number : "";
      if (!number) return [];
      const rowDigits = typeof row.digits === "string" && row.digits
        ? row.digits
        : number.replace(/\D/g, "") || undefined;
      return [{ number, kind: typeof row.kind === "string" ? row.kind : "unknown", digits: rowDigits }];
    })
    : [];
  const seenDigits = new Set(
    phones.map((phone) => phone.digits).filter((value): value is string => Boolean(value)),
  );
  if (input.phone && input.phoneDigits && !seenDigits.has(input.phoneDigits)) {
    phones.push({ number: input.phone, kind: "unknown", digits: input.phoneDigits });
  }

  return {
    firstName: existing.firstName || input.firstName,
    lastName: existing.lastName || input.lastName,
    email: existing.email || input.email,
    phones,
  };
}

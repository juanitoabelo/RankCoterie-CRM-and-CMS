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
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalId(value: unknown): string | null {
  const parsed = text(value);
  return parsed || null;
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
  };
}

export function leadDedupeWhere(input: NormalizedLeadCapture): Record<string, unknown> | null {
  if (input.dedupeMode === "none") return null;
  if (!input.tenantId) return null;

  const emailMatch = input.email
    ? { email: { equals: input.email, mode: "insensitive" } }
    : null;
  const phoneMatch = input.phoneDigits
    ? { phones: { string_contains: input.phoneDigits } }
    : null;

  if (input.dedupeMode === "email") {
    return emailMatch ? { tenantId: input.tenantId, ...emailMatch } : null;
  }

  const matches: Record<string, unknown>[] = [];
  if (emailMatch) matches.push(emailMatch);
  if (phoneMatch) matches.push(phoneMatch);
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
  phones: Array<{ number: string; kind: string }>;
} {
  const phones = Array.isArray(existing.phones)
    ? existing.phones.flatMap((value): Array<{ number: string; kind: string }> => {
      if (typeof value === "string" && value) return [{ number: value, kind: "unknown" }];
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      const number = typeof row.number === "string" ? row.number : "";
      if (!number) return [];
      return [{ number, kind: typeof row.kind === "string" ? row.kind : "unknown" }];
    })
    : [];

  return {
    firstName: existing.firstName || input.firstName,
    lastName: existing.lastName || input.lastName,
    email: existing.email || input.email,
    phones: phones.length ? phones : input.phone ? [{ number: input.phone, kind: "unknown" }] : [],
  };
}

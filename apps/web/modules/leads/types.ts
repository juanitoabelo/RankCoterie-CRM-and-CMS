/**
 * Leads Module — Types
 * 
 * Defines types for lead management.
 */

/** Lead status */
export type LeadStatus = "NEW" | "OPEN" | "CLOSED" | "ARCHIVED";

/** Lead with relations */
export interface LeadWithRelations {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  status: string;
  disposition: string | null;
  campaignId: string | null;
  landingPageId: string | null;
  publisherId: string | null;
  createdAt: Date;
  notes: Array<{ id: string; note: string; createdAt: Date }>;
  todos: Array<{ id: string; text: string; finishedAt: Date | null }>;
}

/** Lead query filters */
export interface LeadFilter {
  status?: LeadStatus | "ALL";
  search?: string;
  page?: number;
  pageSize?: number;
  /** Created-at range (ISO date strings, inclusive). */
  from?: string;
  to?: string;
}

/** Paginated response */
export interface PaginatedLeads {
  items: LeadWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Lead status badge mapping */
export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700",
  OPEN: "bg-amber-50 text-amber-700",
  CLOSED: "bg-emerald-50 text-emerald-700",
  ARCHIVED: "bg-zinc-100 text-zinc-500",
};

/** Lead disposition vocabulary (legacy Canopy disposition list + CONVERTED system value). */
export const LEAD_DISPOSITIONS = [
  "NEW_INQUIRY",
  "CALLBACK_SCHEDULED",
  "BROCHURE_SENT",
  "QUALIFICATION_CALL",
  "PROGRAM_MATCHED",
  "ADMISSION_CONFIRMED",
  "LOST",
  "DUPLICATE",
  "CONVERTED",
] as const;

export type LeadDisposition = (typeof LEAD_DISPOSITIONS)[number];

// ---------------------------------------------------------------------------
// Intake schema — mirrors the legacy Canopy "View/Edit Lead" form sections
// (Lead information / Patient-child profile) plus the Add Lead parent block.
// Single source of truth: the add form, the lead detail page and the legacy
// migration all read these keys, so labels and keys never drift apart.
// ---------------------------------------------------------------------------

export type LeadIntakeSectionKey = "lead" | "patient" | "parent";

export type LeadIntakeFieldType = "text" | "textarea" | "date" | "number" | "yesno" | "select";

export interface LeadIntakeField {
  key: string;
  label: string;
  type: LeadIntakeFieldType;
  section: LeadIntakeSectionKey;
  /** For type="select": option values (an empty value renders as "— select —"). */
  options?: readonly string[];
  placeholder?: string;
  /** Render full-width (spans both columns). */
  wide?: boolean;
  /** Visual group inside a section; a divider is drawn when the group changes. */
  group?: number;
}

export interface LeadIntakeSection {
  key: LeadIntakeSectionKey;
  title: string;
  hint?: string;
}

export const LEAD_INTAKE_SECTIONS: readonly LeadIntakeSection[] = [
  { key: "lead", title: "Lead information" },
  { key: "patient", title: "Patient / child profile" },
  { key: "parent", title: "Parent profile", hint: "Collected on the legacy Add Lead form." },
];

const YESNO = "yesno" as const;

export const LEAD_INTAKE_FIELDS: readonly LeadIntakeField[] = [
  // ---- Lead information (legacy VIEW/EDIT → LEAD INFORMATION) ----
  {
    key: "bestContactMethod",
    label: "Best contact method?",
    type: "select",
    section: "lead",
    options: ["Phone", "Email", "Text"],
  },
  { key: "bestContact", label: "Best time to contact?", type: "text", section: "lead" },
  { key: "additionalPhone", label: "Additional phone #1", type: "text", section: "lead", placeholder: "e.g. 435-567-8934" },
  { key: "dateOfBirth", label: "Date of birth", type: "date", section: "lead" },
  { key: "employer", label: "Employer", type: "text", section: "lead" },
  { key: "jobTitle", label: "Job Title", type: "text", section: "lead" },
  { key: "isParentGuardian", label: "Is parent/guardian?", type: YESNO, section: "lead" },
  { key: "hasLegalCustody", label: "Has legal custody?", type: YESNO, section: "lead" },
  { key: "bothParentsInvolved", label: "Both parents involved?", type: YESNO, section: "lead" },
  { key: "relationshipToPatient", label: "Relationship to patient/child?", type: "text", section: "lead" },
  {
    key: "relationshipDetails",
    label: "Relationship description/details",
    type: "textarea",
    section: "lead",
    wide: true,
    group: 1,
  },
  { key: "insuranceProvider", label: "Insurance provider", type: "text", section: "lead", group: 2 },
  {
    key: "insuranceType",
    label: "Insurance type",
    type: "select",
    section: "lead",
    options: ["PPO", "HMO", "Medicaid", "Medicare", "Self-pay"],
  },
  { key: "insurancePolicyId", label: "Policy ID", type: "text", section: "lead" },
  { key: "insuranceMemberId", label: "Member ID", type: "text", section: "lead" },
  { key: "insuranceGroupId", label: "Group ID", type: "text", section: "lead" },
  { key: "insurancePhone", label: "Insurance phone", type: "text", section: "lead" },
  { key: "monthlyBudget", label: "Monthly budget for treatment", type: "text", section: "lead", group: 3 },
  { key: "howHeard", label: "How they heard about us", type: "text", section: "lead" },

  // ---- Patient / child profile (legacy VIEW/EDIT → PATIENT/CHILD PROFILE) ----
  { key: "patientFullName", label: "Full Name", type: "text", section: "patient" },
  { key: "patientAge", label: "Age", type: "number", section: "patient" },
  { key: "patientDob", label: "Date of birth", type: "date", section: "patient" },
  { key: "patientGender", label: "Gender", type: "text", section: "patient" },
  { key: "isAdopted", label: "Adopted?", type: YESNO, section: "patient" },
  { key: "height", label: "Height", type: "text", section: "patient" },
  { key: "weight", label: "Weight", type: "text", section: "patient" },
  { key: "religion", label: "Religion/Faith", type: "text", section: "patient" },
  {
    key: "expectedEnroll",
    label: "When expected to enroll",
    type: "select",
    section: "patient",
    options: ["ASAP", "Within 2 weeks", "Within 30 days", "Within 90 days", "Undecided"],
  },
  { key: "hasMentalHealthIssues", label: "Has mental health issues?", type: YESNO, section: "patient", group: 1 },
  { key: "hasBeenDiagnosed", label: "Has been diagnosed?", type: YESNO, section: "patient" },
  {
    key: "mentalIllnessDescription",
    label: "Description of mental illness(es)/disorder(s)",
    type: "textarea",
    section: "patient",
    wide: true,
  },
  { key: "pastTrauma", label: "Description of any past trauma", type: "textarea", section: "patient", wide: true, group: 2 },
  { key: "therapyHistory", label: "Description of therapy/treatment history", type: "textarea", section: "patient", wide: true },
  { key: "therapyResponse", label: "Response to therapy/treatment", type: "textarea", section: "patient", wide: true },
  { key: "currentlySuicidal", label: "Currently suicidal?", type: YESNO, section: "patient", group: 3 },
  { key: "suicideAttemptDescription", label: "Description of suicide attempt(s)", type: "textarea", section: "patient", wide: true },
  { key: "physicalHarmDescription", label: "Description of physical harm to self", type: "textarea", section: "patient", wide: true },
  { key: "physicalHealthIssues", label: "Physical health issues?", type: YESNO, section: "patient", group: 4 },
  { key: "iq", label: "IQ", type: "text", section: "patient" },
  { key: "physicalHealthIssuesDescription", label: "Description of physical health issues", type: "textarea", section: "patient", wide: true },
  { key: "allergies", label: "Description of allergies", type: "textarea", section: "patient", wide: true },
  { key: "medications", label: "Description of medications", type: "textarea", section: "patient", wide: true },
  { key: "participatedAlcoholDrug", label: "Participated in alcohol/drug use?", type: YESNO, section: "patient", group: 5 },
  {
    key: "experimentalOrAbuse",
    label: 'Was "experimental" or abuse?',
    type: "select",
    section: "patient",
    options: ["Experimental", "Abuse", "Both"],
  },
  { key: "substanceUseHistory", label: "Description of substance use history", type: "textarea", section: "patient", wide: true },
  { key: "isRunaway", label: "Is a (or has) runaway?", type: YESNO, section: "patient", group: 6 },
  { key: "behaviorsCausingSeekHelp", label: "Behaviors causing parents to seek help", type: "textarea", section: "patient", wide: true },
  { key: "timelineAtRisk", label: "Timeline of at-risk behaviors", type: "textarea", section: "patient", wide: true },
  { key: "schoolPerformance", label: "Description of school/academic performance", type: "textarea", section: "patient", wide: true, group: 7 },
  { key: "onTrackBehind", label: "On-track or behind in school?", type: "textarea", section: "patient", wide: true },
  { key: "additionalSchoolHelp", label: "Additional help required in school?", type: YESNO, section: "patient" },
  { key: "iep504", label: "IEP or 504?", type: YESNO, section: "patient" },
  { key: "areasRequiringHelp", label: "Description of areas requiring help", type: "textarea", section: "patient", wide: true },
  { key: "expelledHistory", label: "Description/history of being expelled", type: "textarea", section: "patient", wide: true },
  { key: "legalIssuesHistory", label: "Description/history of legal issues", type: "textarea", section: "patient", wide: true, group: 8 },
  { key: "hasCourtAppointment", label: "Has court appointment?", type: YESNO, section: "patient" },
  { key: "nextCourtDate", label: "Next court date", type: "date", section: "patient" },
  { key: "hasViolenceBullying", label: "Has displayed violence/bullying?", type: YESNO, section: "patient" },
  { key: "hasArsonHistory", label: "Has history of arson?", type: YESNO, section: "patient" },
  { key: "violenceHistory", label: "Description/history of violence", type: "textarea", section: "patient", wide: true },
  { key: "isSexuallyActive", label: "Is sexually active?", type: YESNO, section: "patient", group: 9 },
  { key: "isViewingPornography", label: "Is viewing pornography?", type: YESNO, section: "patient" },
  { key: "sexualRelationshipsHistory", label: "Description/history of sexual relationships", type: "textarea", section: "patient", wide: true },
  { key: "sexualDevianceHistory", label: "Description/history of sexual deviance", type: "textarea", section: "patient", wide: true },

  // ---- Parent profile (legacy Add Lead form) ----
  { key: "goalAchieve", label: "What do you wish to achieve through treatment?", type: "textarea", section: "parent", wide: true },
  { key: "financialStatus", label: "Financial status", type: "text", section: "parent" },
  {
    key: "knowChildRight",
    label: "Knows child-rights vs parent-rights difference?",
    type: YESNO,
    section: "parent",
  },
  { key: "bothParents", label: "Who has rights to send the child?", type: "text", section: "parent", wide: true },
  { key: "desiredTreatment", label: "Desired treatment type", type: "text", section: "parent", wide: true },
  { key: "genderSpecific", label: "Gender-specific program?", type: YESNO, section: "parent" },
  { key: "christianProgram", label: "Christian-based program concern?", type: YESNO, section: "parent" },
  { key: "comments", label: "Comments", type: "textarea", section: "parent", wide: true },
];

export const LEAD_INTAKE_FIELD_MAP: Readonly<Record<string, LeadIntakeField>> = Object.freeze(
  Object.fromEntries(LEAD_INTAKE_FIELDS.map((f) => [f.key, f])),
);

export function intakeFieldsFor(section: LeadIntakeSectionKey): LeadIntakeField[] {
  return LEAD_INTAKE_FIELDS.filter((f) => f.section === section);
}

export function isYesNoField(field: LeadIntakeField): boolean {
  return field.type === YESNO;
}

/** Parse one posted form value into the stored intake representation. */
export function parseIntakeValue(field: LeadIntakeField, raw: FormDataEntryValue | null): unknown {
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (field.type === "yesno") return value === "1";
  return value;
}

/** Human-readable rendering of a stored intake value. */
export function formatIntakeValue(field: LeadIntakeField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "yesno") return value === true || value === "true" || value === 1 || value === "1" ? "Yes" : "No";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export const CRM_ACTIVITY_TYPES = [
  "NOTE",
  "CALL",
  "EMAIL",
  "MEETING",
  "STAGE_CHANGE",
  "TASK",
  "ASSIGNMENT",
  "SYSTEM",
] as const;

export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number];

export const CRM_ACTIVITY_LABELS: Record<CrmActivityType, string> = {
  NOTE: "Note",
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  STAGE_CHANGE: "Stage change",
  TASK: "Task",
  ASSIGNMENT: "Assignment",
  SYSTEM: "System",
};

export const CRM_TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
export type CrmTaskPriority = (typeof CRM_TASK_PRIORITIES)[number];

export const CRM_TASK_PRIORITY_BADGE: Record<CrmTaskPriority, string> = {
  LOW: "bg-zinc-100 text-zinc-600",
  NORMAL: "bg-sky-50 text-sky-700",
  HIGH: "bg-amber-50 text-amber-700",
};

export type DefaultCrmStage = {
  key: string;
  label: string;
  order: number;
  probability: number;
  isWon?: boolean;
  isLost?: boolean;
};

export const DEFAULT_CRM_STAGES: DefaultCrmStage[] = [
  { key: "new", label: "New", order: 10, probability: 10 },
  { key: "qualified", label: "Qualified", order: 20, probability: 30 },
  { key: "proposal", label: "Proposal", order: 30, probability: 50 },
  { key: "negotiation", label: "Negotiation", order: 40, probability: 70 },
  { key: "won", label: "Won", order: 50, probability: 100, isWon: true },
  { key: "lost", label: "Lost", order: 60, probability: 0, isLost: true },
];

export const CRM_DEAL_SOURCES = [
  "Lead",
  "Client",
  "Referral",
  "Inbound",
  "Outbound",
  "Website",
  "Other",
] as const;

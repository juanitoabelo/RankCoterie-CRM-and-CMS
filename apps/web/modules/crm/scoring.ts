import { prisma, TENANT_ID } from "@/modules/shared";

const DISPOSITION_POINTS: Record<string, number> = {
  NEW_INQUIRY: 0,
  QUALIFICATION_CALL: 10,
  PROGRAM_MATCHED: 15,
  CALLBACK_SCHEDULED: 8,
  ADMISSION_CONFIRMED: 20,
  CONVERTED: 25,
  LOST: -15,
  DUPLICATE: -20,
};

export type LeadScoreInput = {
  email?: string | null;
  phones?: unknown;
  status?: string | null;
  disposition?: string | null;
  assignedToId?: string | null;
  campaignId?: string | null;
  publisherId?: string | null;
  landingPageId?: string | null;
  intake?: unknown;
  createdAt?: Date | null;
  notesCount?: number;
  openTodosCount?: number;
};

export type LeadScoreResult = { score: number; reasons: string[] };

function hasPhones(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((phone) => {
    if (!phone || typeof phone !== "object") return false;
    const number = (phone as { number?: unknown }).number;
    return typeof number === "string" && number.trim().length > 0;
  });
}

function filledIntakeCount(value: unknown): number {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return Object.values(value as Record<string, unknown>).filter((entry) => {
    if (entry === null || entry === undefined) return false;
    if (typeof entry === "string") return entry.trim().length > 0;
    if (Array.isArray(entry)) return entry.length > 0;
    return true;
  }).length;
}

export function calculateLeadScore(input: LeadScoreInput): LeadScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const add = (points: number, reason: string) => {
    if (points === 0) return;
    score += points;
    reasons.push(`${points > 0 ? "+" : ""}${points} ${reason}`);
  };

  if (input.email?.trim()) add(10, "email present");
  if (hasPhones(input.phones)) add(10, "phone present");
  if (input.assignedToId) add(5, "assigned owner");

  const status = (input.status ?? "").toUpperCase();
  if (status === "OPEN") add(10, "open lead");
  if (status === "CLOSED") add(5, "closed lead");
  if (status === "ARCHIVED") add(-10, "archived lead");

  const disposition = (input.disposition ?? "").toUpperCase();
  const dispositionPoints = DISPOSITION_POINTS[disposition] ?? 0;
  add(dispositionPoints, disposition ? `disposition ${disposition.toLowerCase()}` : "");

  if (input.campaignId) add(5, "campaign attribution");
  if (input.publisherId) add(3, "publisher attribution");
  if (input.landingPageId) add(3, "landing page attribution");

  const intakeFilled = filledIntakeCount(input.intake);
  add(Math.min(15, intakeFilled * 2), `${intakeFilled} intake field(s)`);

  if (input.createdAt) {
    const ageDays = (Date.now() - input.createdAt.getTime()) / 86_400_000;
    if (ageDays <= 7) add(5, "recent lead");
    else if (ageDays > 90) add(-5, "stale lead");
  }

  if ((input.notesCount ?? 0) > 0) add(5, "has notes");
  if ((input.openTodosCount ?? 0) > 0) add(5, "has open task");

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export async function updateLeadScore(leadId: string): Promise<number | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: TENANT_ID },
    select: {
      email: true,
      phones: true,
      status: true,
      disposition: true,
      assignedToId: true,
      campaignId: true,
      publisherId: true,
      landingPageId: true,
      intake: true,
      createdAt: true,
    },
  });
  if (!lead) return null;

  const [notesCount, openTodosCount] = await Promise.all([
    prisma.leadNote.count({ where: { leadId } }),
    prisma.toDo.count({ where: { leadId, finishedAt: null } }),
  ]);
  const { score } = calculateLeadScore({ ...lead, notesCount, openTodosCount });
  await prisma.lead.update({
    where: { id: leadId },
    data: { score, scoreUpdatedAt: new Date() },
  });
  return score;
}

export async function recalculateLeadScores(): Promise<number> {
  const leads = await prisma.lead.findMany({
    where: { tenantId: TENANT_ID },
    select: {
      id: true,
      email: true,
      phones: true,
      status: true,
      disposition: true,
      assignedToId: true,
      campaignId: true,
      publisherId: true,
      landingPageId: true,
      intake: true,
      createdAt: true,
      notes: { select: { id: true } },
      todos: { where: { finishedAt: null }, select: { id: true } },
    },
  });

  for (const lead of leads) {
    const { score } = calculateLeadScore({
      ...lead,
      notesCount: lead.notes.length,
      openTodosCount: lead.todos.length,
    });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { score, scoreUpdatedAt: new Date() },
    });
  }
  return leads.length;
}

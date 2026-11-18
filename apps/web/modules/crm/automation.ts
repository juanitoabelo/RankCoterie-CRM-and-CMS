import { prisma, TENANT_ID } from "@/modules/shared";
import { getCrmSettings } from "./settings";
import { updateLeadScore } from "./scoring";
import { logCrmActivity } from "./activity";
import { notifyCrmUser } from "./notifications";

function personName(person: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}): string {
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "Lead";
}

async function pickLeastLoadedRep(): Promise<{ id: string; name: string } | null> {
  const candidates = await prisma.user.findMany({
    where: {
      tenantId: TENANT_ID,
      active: true,
      roles: { some: { role: { in: ["SALES_REP", "ADMIN", "SUPER_ADMIN"] } } },
    },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const ids = candidates.map((candidate) => candidate.id);
  if (ids.length === 0) return null;
  const counts = await prisma.lead.groupBy({
    by: ["assignedToId"],
    where: {
      tenantId: TENANT_ID,
      assignedToId: { in: ids },
      status: { notIn: ["CLOSED", "ARCHIVED"] },
    },
    _count: { _all: true },
  });
  const countById = new Map(counts.map((row) => [row.assignedToId, row._count._all]));
  const best = ids.reduce((current, id) =>
    (countById.get(id) ?? 0) < (countById.get(current) ?? 0) ? id : current,
  );
  const user = candidates.find((candidate) => candidate.id === best);
  return user ? { id: user.id, name: personName(user) } : null;
}

/**
 * Apply the tenant's lead automation rules to a single lead.
 * Safe to call after any ingestion path (admin create, public form, custom form, import).
 */
export async function applyLeadAutomation(
  leadId: string,
  options: { autoAssign?: boolean; score?: boolean } = {},
): Promise<{ assignedToId: string | null; score: number | null }> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId: TENANT_ID },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      assignedToId: true,
    },
  });
  if (!lead) return { assignedToId: null, score: null };

  let assignedToId = lead.assignedToId;
  if (!assignedToId && options.autoAssign !== false) {
    const settings = await getCrmSettings();
    if (settings.autoAssignLeads) {
      const rep = await pickLeastLoadedRep();
      if (rep) {
        assignedToId = rep.id;
        await prisma.lead.update({ where: { id: lead.id }, data: { assignedToId } });
        await logCrmActivity({
          type: "ASSIGNMENT",
          subject: `Auto-assigned to ${rep.name}`,
          body: "Assigned by the CRM round-robin rule.",
          leadId: lead.id,
          metadata: { automated: true, assignedToId },
        });
        await notifyCrmUser({
          userId: rep.id,
          type: "LEAD_ASSIGNED",
          title: "New lead assigned",
          body: personName(lead),
          link: `/admin/leads/${lead.id}`,
        });
      }
    }
  }

  const score = options.score === false ? null : await updateLeadScore(lead.id);
  return { assignedToId, score };
}

export async function backfillLeadAutomation(options: {
  autoAssign?: boolean;
  score?: boolean;
} = {}): Promise<{ processed: number; assigned: number; scored: number }> {
  const leads = await prisma.lead.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  let assigned = 0;
  let scored = 0;
  for (const lead of leads) {
    const result = await applyLeadAutomation(lead.id, options);
    if (result.assignedToId) assigned += 1;
    if (result.score !== null) scored += 1;
  }
  return { processed: leads.length, assigned, scored };
}

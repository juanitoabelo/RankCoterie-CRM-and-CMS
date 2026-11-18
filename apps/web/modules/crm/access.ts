import { Prisma, Role } from "@prisma/client";
import type { AdminUser } from "@/modules/auth";
import { getCrmSettings } from "./settings";

export type CrmAccess = {
  userId: string;
  isAdmin: boolean;
  ownedOnly: boolean;
};

export async function getCrmAccessForUser(user: AdminUser): Promise<CrmAccess> {
  const isAdmin = user.roles.includes(Role.SUPER_ADMIN) || user.roles.includes(Role.ADMIN);
  if (isAdmin) return { userId: user.id, isAdmin: true, ownedOnly: false };
  const settings = await getCrmSettings();
  return { userId: user.id, isAdmin: false, ownedOnly: settings.restrictSalesRepsToOwned };
}

export function dealAccessWhere(access?: CrmAccess): Prisma.DealWhereInput {
  return access?.ownedOnly ? { ownerId: access.userId } : {};
}

export function leadAccessWhere(access?: CrmAccess): Prisma.LeadWhereInput {
  return access?.ownedOnly ? { assignedToId: access.userId } : {};
}

export function clientAccessWhere(access?: CrmAccess): Prisma.ClientWhereInput {
  return access?.ownedOnly ? { assignedToId: access.userId } : {};
}

export function activityAccessWhere(access?: CrmAccess): Prisma.CrmActivityWhereInput {
  if (!access?.ownedOnly) return {};
  return {
    OR: [
      { deal: { ownerId: access.userId } },
      { lead: { assignedToId: access.userId } },
      { client: { assignedToId: access.userId } },
    ],
  };
}

export function taskAccessWhere(access?: CrmAccess): Prisma.ToDoWhereInput {
  if (!access?.ownedOnly) return {};
  return {
    OR: [
      { assigneeId: access.userId },
      { deal: { ownerId: access.userId } },
      { lead: { assignedToId: access.userId } },
      { client: { assignedToId: access.userId } },
    ],
  };
}

export function canManageCrm(access: CrmAccess): boolean {
  return access.isAdmin;
}

export function dealWriteWhere(access: CrmAccess, dealId: string): Prisma.DealWhereInput {
  return { id: dealId, ...dealAccessWhere(access) };
}

export function leadWriteWhere(access: CrmAccess, leadId: string): Prisma.LeadWhereInput {
  return { id: leadId, ...leadAccessWhere(access) };
}

export function clientWriteWhere(access: CrmAccess, clientId: string): Prisma.ClientWhereInput {
  return { id: clientId, ...clientAccessWhere(access) };
}

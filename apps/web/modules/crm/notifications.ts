import { prisma, TENANT_ID } from "@/modules/shared";

export type CrmNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function notifyCrmUser(input: CrmNotificationInput): Promise<void> {
  if (!input.userId) return;
  await prisma.crmNotification.create({
    data: {
      tenantId: TENANT_ID,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body?.trim() || null,
      link: input.link?.trim() || null,
    },
  });
}

export async function getUnreadCrmNotifications(userId: string, take = 20) {
  return prisma.crmNotification.findMany({
    where: { tenantId: TENANT_ID, userId, readAt: null },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markCrmNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.crmNotification.updateMany({
    where: { tenantId: TENANT_ID, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

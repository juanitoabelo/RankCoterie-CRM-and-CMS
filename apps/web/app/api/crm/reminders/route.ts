import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { sendEmail } from "@/lib/email/send";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secrets = [process.env.CRM_REMINDER_SECRET, process.env.CRON_SECRET].filter(
    (value): value is string => Boolean(value),
  );
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return secrets.some(
    (secret) => bearer === secret || request.headers.get("x-crm-reminder-secret") === secret,
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function taskLink(task: {
  dealId: string | null;
  leadId: string | null;
  clientId: string | null;
}): string {
  if (task.dealId) return `/admin/crm/deals/${task.dealId}`;
  if (task.leadId) return `/admin/leads/${task.leadId}`;
  if (task.clientId) return `/admin/clients/${task.clientId}`;
  return "/admin/crm";
}

async function runReminders(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tasks = await prisma.toDo.findMany({
    where: {
      finishedAt: null,
      assigneeId: { not: null },
      dueAt: { not: null, lte: tomorrow },
      OR: [
        { lead: { tenantId: TENANT_ID } },
        { client: { tenantId: TENANT_ID } },
        { deal: { tenantId: TENANT_ID } },
      ],
    },
    include: {
      lead: { select: { firstName: true, lastName: true, email: true } },
      client: { select: { firstName: true, lastName: true, email: true } },
      deal: { select: { title: true } },
    },
    orderBy: [{ dueAt: "asc" }],
    take: 500,
  });

  const assigneeIds = [...new Set(tasks.map((task) => task.assigneeId).filter((id): id is string => Boolean(id)))];
  const users = assigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds }, tenantId: TENANT_ID, active: true },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));

  let sent = 0;
  let skipped = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const user of users) {
    const userTasks = tasks.filter((task) => task.assigneeId === user.id);
    if (userTasks.length === 0) continue;

    const fresh = [];
    for (const task of userTasks) {
      const title = `Task due: ${task.id}`;
      const already = await prisma.crmNotification.findFirst({
        where: { tenantId: TENANT_ID, userId: user.id, title, createdAt: { gte: dayStart } },
        select: { id: true },
      });
      if (already) {
        skipped += 1;
        continue;
      }
      fresh.push(task);
    }
    if (fresh.length === 0) continue;

    const rows = fresh
      .map((task) => {
        const context =
          task.deal?.title ??
          (`${task.lead?.firstName ?? ""} ${task.lead?.lastName ?? ""}`.trim() ||
            `${task.client?.firstName ?? ""} ${task.client?.lastName ?? ""}`.trim() ||
            "CRM");
        const overdue = task.dueAt && task.dueAt < now;
        return `<li><strong>${escapeHtml(task.text)}</strong> · ${escapeHtml(context)} · due ${
          task.dueAt ? task.dueAt.toISOString().slice(0, 10) : "—"
        }${overdue ? " (overdue)" : ""} · <a href="${taskLink(task)}">Open</a></li>`;
      })
      .join("");

    const result = await sendEmail({
      to: user.email,
      subject: `CRM task reminder (${fresh.length})`,
      html: `<p>You have ${fresh.length} CRM task(s) due in the next 24 hours.</p><ul>${rows}</ul>`,
      text: fresh.map((task) => `- ${task.text}`).join("\n"),
    });
    if (!result.ok) {
      const error = result.error ?? "send failed";
      errors.push({ userId: user.id, error });
      reportCrmIssue("error", "crm.reminders.email", new Error(error), { userId: user.id });
      continue;
    }

    await prisma.crmNotification.createMany({
      data: fresh.map((task) => ({
        tenantId: TENANT_ID,
        userId: user.id,
        type: "TASK_REMINDER",
        title: `Task due: ${task.id}`,
        body: task.text,
        link: taskLink(task),
      })),
    });
    sent += 1;
  }

  await logAudit({
    action: "CRM_REMINDER_SEND",
    entity: "ToDo",
    entityId: "reminders",
    actorId: null,
    reason: `Sent ${sent} CRM reminder email(s)`,
    meta: { tasks: tasks.length, users: users.length, sent, skipped, errors: errors.length },
  }).catch(() => null);

  return NextResponse.json({ tasks: tasks.length, users: users.length, sent, skipped, errors });
}

export async function GET(request: Request) {
  return runReminders(request);
}

export async function POST(request: Request) {
  return runReminders(request);
}

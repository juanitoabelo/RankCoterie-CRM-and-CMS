import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { reportCrmIssue } from "@/lib/monitoring";
import { enqueueCrmWebhook } from "@/lib/webhooks/dispatch";
import { logCrmActivity } from "./activity";
import { sendCrmEmail } from "./oauth-sync";
import {
  buildUnsubscribeUrl,
  generateTrackingToken,
  isEmailSuppressed,
  prepareTrackedEmail,
  recordEmailEvent,
  recordEmailFailure,
} from "./email-tracking";

export type CrmSequenceResult = {
  ok: boolean;
  error?: string;
  message?: string;
  id?: string;
};

function text(value: FormDataEntryValue | null | undefined): string {
  return String(value ?? "").trim();
}

function revalidateSequences(): void {
  revalidatePath("/admin/crm/sequences");
  revalidatePath("/admin/crm/settings");
}

export async function getCrmSequences() {
  return prisma.crmEmailSequence.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      _count: { select: { steps: true, enrollments: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCrmSequence(id: string) {
  return prisma.crmEmailSequence.findFirst({
    where: { id, tenantId: TENANT_ID },
    include: {
      steps: { orderBy: { position: "asc" } },
      enrollments: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 10 },
        },
      },
    },
  });
}

function renderTemplate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export async function createCrmEmailSequence(input: {
  name: string;
  description?: string;
  subject: string;
  body: string;
  status?: string;
}): Promise<CrmSequenceResult> {
  const user = await requireSection("crm");
  const name = text(input.name);
  const subject = text(input.subject);
  const body = String(input.body ?? "").trim();
  if (!name || !subject || !body) {
    return { ok: false, error: "Name, subject, and body are required." };
  }

  const sequence = await prisma.crmEmailSequence.create({
    data: {
      tenantId: TENANT_ID,
      name,
      description: text(input.description) || null,
      subject,
      body,
      status: input.status === "ACTIVE" ? "ACTIVE" : "DRAFT",
      createdById: user.id,
    },
  });
  await logAudit({
    action: "CRM_SEQUENCE_CREATE",
    entity: "CrmEmailSequence",
    entityId: sequence.id,
    actorId: user.id,
    reason: `Email sequence "${name}" created`,
  });
  revalidateSequences();
  return { ok: true, message: "Sequence created.", id: sequence.id };
}

export async function addCrmSequenceStep(input: {
  sequenceId: string;
  subject: string;
  body: string;
  delayMinutes?: string;
}): Promise<CrmSequenceResult> {
  await requireSection("crm");
  const sequenceId = text(input.sequenceId);
  const subject = text(input.subject);
  const body = String(input.body ?? "").trim();
  if (!sequenceId || !subject || !body) {
    return { ok: false, error: "Subject and body are required." };
  }
  const delayMinutes = Number(text(input.delayMinutes) || "0");
  if (!Number.isInteger(delayMinutes) || delayMinutes < 0) {
    return { ok: false, error: "Delay must be a non-negative number of minutes." };
  }

  const sequence = await prisma.crmEmailSequence.findFirst({
    where: { id: sequenceId, tenantId: TENANT_ID },
    select: { id: true },
  });
  if (!sequence) return { ok: false, error: "Sequence not found." };
  const last = await prisma.crmEmailSequenceStep.findFirst({
    where: { sequenceId, tenantId: TENANT_ID },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const step = await prisma.crmEmailSequenceStep.create({
    data: {
      tenantId: TENANT_ID,
      sequenceId,
      position: (last?.position ?? -1) + 1,
      subject,
      body,
      delayMinutes,
    },
  });
  revalidateSequences();
  return { ok: true, message: "Step added.", id: step.id };
}

export async function setCrmSequenceStatus(
  sequenceId: string,
  status: "DRAFT" | "ACTIVE" | "PAUSED",
): Promise<CrmSequenceResult> {
  const user = await requireSection("crm");
  const result = await prisma.crmEmailSequence.updateMany({
    where: { id: sequenceId, tenantId: TENANT_ID },
    data: { status },
  });
  if (result.count === 0) return { ok: false, error: "Sequence not found." };
  await logAudit({
    action: "CRM_SEQUENCE_CREATE",
    entity: "CrmEmailSequence",
    entityId: sequenceId,
    actorId: user.id,
    reason: `Sequence status changed to ${status}`,
  });
  revalidateSequences();
  return { ok: true, message: `Sequence ${status.toLowerCase()}.` };
}

export async function enrollCrmSequence(input: {
  sequenceId: string;
  connectionId: string;
  toEmail: string;
  leadId?: string;
  clientId?: string;
  dealId?: string;
  firstName?: string;
  lastName?: string;
}): Promise<CrmSequenceResult> {
  const user = await requireSection("crm");
  const sequenceId = text(input.sequenceId);
  const connectionId = text(input.connectionId);
  const toEmail = text(input.toEmail).toLowerCase();
  if (!sequenceId || !connectionId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    return { ok: false, error: "A mailbox connection and valid recipient email are required." };
  }

  const [sequence, connection] = await Promise.all([
    prisma.crmEmailSequence.findFirst({
      where: { id: sequenceId, tenantId: TENANT_ID },
      select: { id: true, status: true },
    }),
    prisma.crmEmailConnection.findFirst({
      where: { id: connectionId, tenantId: TENANT_ID, active: true },
      select: { id: true },
    }),
  ]);
  if (!sequence) return { ok: false, error: "Sequence not found." };
  if (sequence.status !== "ACTIVE") return { ok: false, error: "Activate the sequence first." };
  if (!connection) return { ok: false, error: "Mail connection not found." };
  if (await isEmailSuppressed(toEmail)) {
    return { ok: false, error: "This recipient has unsubscribed and cannot be enrolled." };
  }

  try {
    const enrollment = await prisma.crmEmailSequenceEnrollment.create({
      data: {
        tenantId: TENANT_ID,
        sequenceId,
        connectionId,
        toEmail,
        leadId: text(input.leadId) || null,
        clientId: text(input.clientId) || null,
        dealId: text(input.dealId) || null,
        status: "ACTIVE",
        currentStep: 0,
        nextSendAt: new Date(),
      },
    });
    await logAudit({
      action: "CRM_SEQUENCE_ENROLL",
      entity: "CrmEmailSequenceEnrollment",
      entityId: enrollment.id,
      actorId: user.id,
      reason: `Enrolled ${toEmail} in a sequence`,
    });
    revalidateSequences();
    return { ok: true, message: "Contact enrolled.", id: enrollment.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "This email is already enrolled in this sequence." };
    }
    throw error;
  }
}

export async function processDueCrmSequenceEnrollments(limit = 25): Promise<{
  processed: number;
  sent: number;
  completed: number;
  failed: number;
}> {
  const now = new Date();
  const summary = { processed: 0, sent: 0, completed: 0, failed: 0 };
  const due = await prisma.crmEmailSequenceEnrollment.findMany({
    where: {
      tenantId: TENANT_ID,
      status: "ACTIVE",
      nextSendAt: { lte: now },
      sequence: { status: "ACTIVE" },
    },
    include: {
      sequence: {
        include: { steps: { orderBy: { position: "asc" } } },
      },
    },
    orderBy: { nextSendAt: "asc" },
    take: Math.max(1, Math.min(100, limit)),
  });
  const leadIds = due.map((row) => row.leadId).filter((id): id is string => Boolean(id));
  const clientIds = due.map((row) => row.clientId).filter((id): id is string => Boolean(id));
  const dealIds = due.map((row) => row.dealId).filter((id): id is string => Boolean(id));
  const [leads, clients, deals] = await Promise.all([
    leadIds.length
      ? prisma.lead.findMany({
          where: { id: { in: leadIds }, tenantId: TENANT_ID },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [],
    clientIds.length
      ? prisma.client.findMany({
          where: { id: { in: clientIds }, tenantId: TENANT_ID },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [],
    dealIds.length
      ? prisma.deal.findMany({
          where: { id: { in: dealIds }, tenantId: TENANT_ID },
          select: { id: true, title: true },
        })
      : [],
  ]);
  const leadById = new Map(leads.map((row) => [row.id, row]));
  const clientById = new Map(clients.map((row) => [row.id, row]));
  const dealById = new Map(deals.map((row) => [row.id, row]));

  for (const enrollment of due) {
    const claimed = await prisma.crmEmailSequenceEnrollment.updateMany({
      where: {
        id: enrollment.id,
        tenantId: TENANT_ID,
        status: "ACTIVE",
        nextSendAt: { lte: now },
      },
      data: { nextSendAt: new Date(now.getTime() + 10 * 60 * 1000) },
    });
    if (claimed.count === 0) continue;
    summary.processed += 1;

    if (await isEmailSuppressed(enrollment.toEmail)) {
      await prisma.crmEmailSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "CANCELLED" },
      });
      continue;
    }

    const step = enrollment.sequence.steps[enrollment.currentStep];
    if (!step) {
      await prisma.crmEmailSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED" },
      });
      summary.completed += 1;
      continue;
    }

    if (!enrollment.connectionId) {
      await prisma.crmEmailSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "FAILED" },
      });
      summary.failed += 1;
      continue;
    }

    const linkedLead = enrollment.leadId ? leadById.get(enrollment.leadId) : undefined;
    const linkedClient = enrollment.clientId ? clientById.get(enrollment.clientId) : undefined;
    const linkedDeal = enrollment.dealId ? dealById.get(enrollment.dealId) : undefined;
    const trackingToken = generateTrackingToken();
    const values = {
      firstName: linkedLead?.firstName ?? linkedClient?.firstName ?? "",
      lastName: linkedLead?.lastName ?? linkedClient?.lastName ?? "",
      email: linkedLead?.email ?? linkedClient?.email ?? enrollment.toEmail,
      dealTitle: linkedDeal?.title ?? "",
      unsubscribeUrl: buildUnsubscribeUrl(trackingToken),
    };
    const subject = renderTemplate(step.subject || enrollment.sequence.subject, values);
    const body = renderTemplate(step.body, values);
    const tracked = prepareTrackedEmail({ body, token: trackingToken, trackingEnabled: true });
    const headers = {
      "List-Unsubscribe": `<${tracked.unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    };
    const message = await prisma.crmEmailMessage.create({
      data: {
        tenantId: TENANT_ID,
        enrollmentId: enrollment.id,
        connectionId: enrollment.connectionId,
        leadId: enrollment.leadId,
        clientId: enrollment.clientId,
        dealId: enrollment.dealId,
        toEmail: enrollment.toEmail,
        subject,
        body: tracked.body,
        bodyHtml: tracked.htmlBody,
        trackingToken,
        trackingEnabled: true,
        status: "QUEUED",
      },
    });

    try {
      const sent = await sendCrmEmail({
        connectionId: enrollment.connectionId,
        to: enrollment.toEmail,
        subject,
        body: tracked.body,
        htmlBody: tracked.htmlBody,
        headers,
      });
      const sentAt = new Date();
      await prisma.crmEmailMessage.update({
        where: { id: message.id },
        data: {
          status: "SENT",
          providerMessageId: sent.providerMessageId,
          sentAt,
        },
      });
      await recordEmailEvent({
        messageId: message.id,
        enrollmentId: enrollment.id,
        type: "SENT",
        occurredAt: sentAt,
        recipient: enrollment.toEmail,
        providerEventId: sent.providerMessageId ?? `sequence-sent:${message.id}`,
        provider: "mailbox",
      });
      await logCrmActivity({
        type: "EMAIL",
        subject,
        body: body.slice(0, 5000),
        leadId: enrollment.leadId,
        clientId: enrollment.clientId,
        dealId: enrollment.dealId,
        externalId: `crm:email:${message.id}`,
        source: "sequence",
        metadata: {
          sequenceId: enrollment.sequenceId,
          enrollmentId: enrollment.id,
          fromEmail: sent.fromEmail,
          messageId: message.id,
          trackingEnabled: true,
        },
      });
      await logAudit({
        action: "CRM_SEQUENCE_SEND",
        entity: "CrmEmailSequenceEnrollment",
        entityId: enrollment.id,
        reason: `Sequence email sent to ${enrollment.toEmail}`,
        meta: {
          sequenceId: enrollment.sequenceId,
          messageId: message.id,
          subject,
          providerMessageId: sent.providerMessageId,
        },
      });
      await enqueueCrmWebhook("sequence.sent", {
        sequenceId: enrollment.sequenceId,
        enrollmentId: enrollment.id,
        leadId: enrollment.leadId,
        clientId: enrollment.clientId,
        dealId: enrollment.dealId,
        toEmail: enrollment.toEmail,
        subject,
        messageId: message.id,
      });

      const nextStepIndex = enrollment.currentStep + 1;
      if (nextStepIndex >= enrollment.sequence.steps.length) {
        await prisma.crmEmailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: { status: "COMPLETED", currentStep: nextStepIndex },
        });
        summary.completed += 1;
      } else {
        const nextStep = enrollment.sequence.steps[nextStepIndex];
        await prisma.crmEmailSequenceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            currentStep: nextStepIndex,
            nextSendAt: new Date(Date.now() + nextStep.delayMinutes * 60_000),
          },
        });
      }
      summary.sent += 1;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      await prisma.crmEmailMessage.update({
        where: { id: message.id },
        data: { status: "FAILED", error: messageText.slice(0, 1000) },
      });
      await prisma.crmEmailSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "FAILED" },
      });
      await recordEmailFailure({
        messageId: message.id,
        enrollmentId: enrollment.id,
        recipient: enrollment.toEmail,
        failureCode: "SEQUENCE_SEND_FAILED",
        metadata: {
          sequenceId: enrollment.sequenceId,
          error: messageText.slice(0, 500),
        },
      }).catch(() => null);
      reportCrmIssue("error", "crm.sequence.send", error, {
        enrollmentId: enrollment.id,
        sequenceId: enrollment.sequenceId,
      });
      summary.failed += 1;
    }
  }

  return summary;
}

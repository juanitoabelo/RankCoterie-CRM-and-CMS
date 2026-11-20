import { NextResponse } from "next/server";
import { prisma, TENANT_ID } from "@/modules/shared";
import { canAccessAnySectionForUser, getApiUser } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { logAudit } from "@/lib/audit";
import { logCrmActivity } from "@/modules/crm/activity";
import { deleteCrmFile, isObjectStorageConfigured, storeCrmFile } from "@/lib/crm-storage";
import { reportCrmIssue } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user || !(await canAccessAnySectionForUser(user, ["crm", "leads", "clients"]))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const access = await getCrmAccessForUser(user);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 20MB)." }, { status: 413 });
  }

  const dealId = String(formData.get("dealId") ?? "").trim() || null;
  const leadId = String(formData.get("leadId") ?? "").trim() || null;
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const targets = [dealId, leadId, clientId].filter(Boolean);
  if (targets.length !== 1) {
    return NextResponse.json(
      { error: "Attach the file to exactly one deal, lead, or client." },
      { status: 400 },
    );
  }

  const ownedOnly = access.ownedOnly;
  if (dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, tenantId: TENANT_ID, ...(ownedOnly ? { ownerId: user.id } : {}) },
      select: { id: true },
    });
    if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
  if (leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId: TENANT_ID, ...(ownedOnly ? { assignedToId: user.id } : {}) },
      select: { id: true },
    });
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  if (clientId) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, tenantId: TENANT_ID, ...(ownedOnly ? { assignedToId: user.id } : {}) },
      select: { id: true },
    });
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const storageProvider = (await isObjectStorageConfigured()) ? "vercel-blob" : null;
  let stored: { provider: "vercel-blob"; key: string } | null = null;
  let bytes: Uint8Array<ArrayBuffer> | null = null;
  try {
    if (storageProvider) {
      stored = await storeCrmFile(file);
    } else {
      bytes = new Uint8Array(await file.arrayBuffer());
    }

    const attachmentBytes = bytes;
    const attachment = await prisma.$transaction(async (tx) => {
      const asset = attachmentBytes
        ? await tx.asset.create({
            data: {
              tenantId: TENANT_ID,
              kind: "file",
              mimeType: file.type,
              size: file.size,
              filename: file.name,
              bytes: attachmentBytes,
            },
          })
        : null;
      const row = await tx.crmAttachment.create({
        data: {
          tenantId: TENANT_ID,
          dealId,
          leadId,
          clientId,
          assetId: asset?.id ?? null,
          storageProvider: stored?.provider ?? null,
          storageKey: stored?.key ?? null,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedById: user.id,
        },
      });
      await logCrmActivity({
        type: "NOTE",
        subject: `Attachment added: ${file.name}`,
        body: null,
        userId: user.id,
        dealId,
        leadId,
        clientId,
        metadata: {
          attachmentId: row.id,
          mimeType: file.type,
          size: file.size,
          storage: stored?.provider ?? "database",
        },
        client: tx,
      });
      return row;
    });

    await logAudit({
      action: "CRM_ATTACHMENT_ADD",
      entity: "CrmAttachment",
      entityId: attachment.id,
      actorId: user.id,
      reason: `Attachment "${file.name}" uploaded`,
      meta: {
        dealId,
        leadId,
        clientId,
        size: file.size,
        mimeType: file.type,
        storage: stored?.provider ?? "database",
      },
    });

    return NextResponse.json({
      id: attachment.id,
      url: `/api/crm/attachments/${attachment.id}/`,
      filename: attachment.filename,
    });
  } catch (error) {
    if (stored) await deleteCrmFile(stored.provider, stored.key).catch(() => null);
    reportCrmIssue("error", "crm.attachments.upload", error, {
      dealId,
      leadId,
      clientId,
      size: file.size,
      mimeType: file.type,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save attachment." },
      { status: 500 },
    );
  }
}

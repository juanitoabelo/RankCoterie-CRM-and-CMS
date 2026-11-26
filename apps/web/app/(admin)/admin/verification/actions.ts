"use server";

import { Prisma, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { logAudit, type AuditAction } from "@/lib/audit";
import { requireSection } from "@/modules/auth";
import { TENANT_ID } from "@/lib/tenant";
import { attachVerificationUsers } from "@/lib/verification-users";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function getVerificationRequests(status?: string) {
  await requireSection("verification");
  const where: Prisma.VerificationRequestWhereInput = { tenantId: TENANT_ID };
  if (status && status !== "ALL") where.status = status as VerificationStatus;
  
  const requests = await prisma.verificationRequest.findMany({
    where,
    include: {
      listing: { select: { title: true, slug: true, companyName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return attachVerificationUsers(requests);
}

export async function getVerificationRequest(id: string) {
  await requireSection("verification");
  const request = await prisma.verificationRequest.findUnique({
    where: { id, tenantId: TENANT_ID },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          companyName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!request) return null;
  const [withUsers] = await attachVerificationUsers([request]);
  return withUsers;
}

export async function updateVerificationRequest(id: string, formData: FormData): Promise<ActionResult> {
  await requireSection("verification");
  const status = formData.get("status") as string;
  const rejectionReason = formData.get("rejectionReason") as string | null;

  if (!status || !["PENDING", "IN_REVIEW", "APPROVED", "REJECTED", "EXPIRED"].includes(status)) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    const request = await prisma.verificationRequest.findUnique({
      where: { id, tenantId: TENANT_ID },
      include: { listing: true },
    });

    if (!request) return { ok: false, error: "Verification request not found." };

    const updateData: Prisma.VerificationRequestUncheckedUpdateInput = {
      status: status as VerificationStatus,
      reviewedById: "admin-user-id", // TODO: get from session
      reviewedAt: new Date(),
    };

    if (status === "REJECTED" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    if (status === "APPROVED") {
      // Update listing badges
      const listing = await prisma.listing.findUnique({
        where: { id: request.listingId },
        select: { badges: true },
      });
      
      const badges = (listing?.badges as string[]) || [];
      if (!badges.includes("verified")) {
        await prisma.listing.update({
          where: { id: request.listingId },
          data: { 
            badges: [...badges, "verified"],
            verifiedAt: new Date(),
            verifiedFields: { push: "verification" },
          },
        });
      }
    }

    await prisma.verificationRequest.update({
      where: { id, tenantId: TENANT_ID },
      data: updateData,
    });

    // Log audit
    await logAudit({
      action: `VERIFICATION_${status}` as AuditAction,
      entity: "VerificationRequest",
      entityId: id,
      meta: { type: "VERIFICATION", listingId: request.listingId },
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update verification request." };
  }
}

export async function getVerificationTypes() {
  return [
    { value: "EMAIL", label: "Email Verification" },
    { value: "PHONE", label: "Phone Verification" },
    { value: "LICENSE", label: "License Verification" },
    { value: "IDENTITY", label: "Identity Verification" },
    { value: "BUSINESS_LICENSE", label: "Business License" },
    { value: "INSURANCE", label: "Insurance Verification" },
  ];
}

export async function getVerificationStatuses() {
  return [
    { value: "PENDING", label: "Pending" },
    { value: "IN_REVIEW", label: "In Review" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "EXPIRED", label: "Expired" },
  ];
}
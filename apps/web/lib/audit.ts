/**
 * Canopy V2 — shared audit trail (§README "Robustness upgrades").
 *
 * Every admin action that changes business state (suppression add/remove, listing
 * approve/reject, tier change, refund) writes an AuditLog row with actor + reason.
 * The legacy system had none; this is the single helper so callers can't skip it.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";

export type AuditAction =
  | "SUPPRESS_ADD"
  | "SUPPRESS_REMOVE"
  | "LISTING_CREATE"
  | "LISTING_UPDATE"
  | "LISTING_APPROVE"
  | "LISTING_REJECT"
  | "LISTING_SUSPEND"
  | "LISTING_EXPIRE"
  | "LISTING_TIER_CHANGE"
  | "ARTICLE_APPROVE"
  | "ARTICLE_TRASH"
  | "FEED_CREATE"
  | "FEED_TOGGLE"
  | "LEAD_STATUS_CHANGE"
  | "LEAD_NOTE_ADD"
  | "TODO_TOGGLE"
  | "INVOICE_STATUS_OVERRIDE"
  | "REFUND"
  | "CHARGEBACK"
  | "MERCHANT_CREATE"
  | "MERCHANT_TOGGLE"
  | "CATEGORY_CREATE"
  | "CATEGORY_UPDATE"
  | "CATEGORY_DELETE"
  | "PAGE_CREATE"
  | "PAGE_UPDATE"
  | "PAGE_DELETE"
  | "PAGE_RESTORE"
  | "PAGE_STATUS"
  | "ARTICLE_CREATE"
  | "ARTICLE_UPDATE"
  | "ARTICLE_DELETE"
  | "TEMPLATE_CREATE"
  | "TEMPLATE_UPDATE"
  | "TEMPLATE_DELETE"
  | "REGION_CREATE"
  | "REGION_UPDATE"
  | "REGION_DELETE"
  | "STYLE_GUIDE_UPDATE"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "SECTION_CREATE"
  | "SECTION_UPDATE"
  | "SECTION_DELETE"
  | "CATEGORY_IMAGE_CREATE"
  | "CATEGORY_IMAGE_DELETE"
  | "MENU_CREATE"
  | "MENU_UPDATE"
  | "MENU_DELETE"
  | "WIDGET_CREATE"
  | "WIDGET_UPDATE"
  | "WIDGET_DELETE"
  | "COMPANY_UPDATE";

export interface AuditInput {
  action: AuditAction;
  entity: string; // entity type, e.g. "ExcludedCompany" | "Listing"
  entityId: string;
  actorId?: string | null; // null until Auth.js wiring lands
  reason?: string | null;
  meta?: Record<string, unknown> | null;
}

export async function logAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: process.env.CANOPY_TENANT_ID ?? "tenant-masternet",
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      reason: input.reason ?? null,
      meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
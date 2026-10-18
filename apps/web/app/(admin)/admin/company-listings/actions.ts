"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { createInvoicePaymentLink, deactivateInvoicePaymentLink } from "@/lib/billing/client-payments";
import { activateListingFromInvoice } from "@/lib/billing/listing-activation";
import { sendInvoicePaymentEmail } from "@/lib/email/invoices";

export type ActionResult = { ok: boolean; error?: string; id?: string; message?: string; url?: string };

const STATUSES = ["DRAFT", "PENDING_REVIEW", "LIVE", "SUSPENDED", "EXPIRED"] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "company-page";
  let slug = root;
  for (let i = 2; i < 50; i++) {
    const clash = await prisma.listing.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!clash) return slug;
    slug = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

function list(fd: FormData, key: string): string[] {
  return fd.getAll(key).map(String).filter(Boolean);
}

function parseSpecialties(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);
}

type Parsed = {
  title: string;
  slug: string;
  status: (typeof STATUSES)[number];
  website: string | null;
  companyName: string | null;
  summary: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  description: string | null;
  staff: string | null;
  specialties: string[];
  keywords: string | null;
  avatarImage: string | null;
  feedImage: string | null;
  companyId: string | null;
  authorId: string | null;
  companyListingTemplateId: string | null;
  tier: "FREE" | "PREMIUM";
  spiderIgnore: boolean;
  categoryIds: string[];
  regionIds: string[];
  sectionIds: string[];
  subTopicIds: string[];
};

function parseForm(fd: FormData): Parsed | { error: string } {
  const title = str(fd, "title");
  if (!title) return { error: "Company Name (title) is required." };
  const statusRaw = str(fd, "status") || "LIVE";
  const status = (STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as Parsed["status"])
    : "LIVE";
  return {
    title,
    slug: slugify(str(fd, "slug") || title),
    status,
    website: str(fd, "website") || null,
    companyName: str(fd, "companyName") || null,
    summary: str(fd, "summary") || null,
    phone: str(fd, "phone") || null,
    address: str(fd, "address") || null,
    city: str(fd, "city") || null,
    state: str(fd, "state") || null,
    zip: str(fd, "zip") || null,
    description: str(fd, "description") || null,
    staff: str(fd, "staff") || null,
    specialties: parseSpecialties(str(fd, "specialties")),
    keywords: str(fd, "keywords") || null,
    avatarImage: str(fd, "avatarImage") || null,
    feedImage: str(fd, "feedImage") || null,
    companyId: str(fd, "companyId") || null,
    authorId: str(fd, "authorId") || null,
    companyListingTemplateId: str(fd, "companyListingTemplateId") || null,
    tier: fd.get("premium") === "on" || fd.get("premium") === "true" ? "PREMIUM" : "FREE",
    spiderIgnore: fd.get("spiderIgnore") === "on" || fd.get("spiderIgnore") === "true",
    categoryIds: list(fd, "categoryIds"),
    regionIds: list(fd, "regionIds"),
    sectionIds: list(fd, "sectionIds"),
    subTopicIds: list(fd, "subTopicIds"),
  };
}

async function setMemberships(
  tx: Prisma.TransactionClient,
  listingId: string,
  input: Parsed,
): Promise<void> {
  await tx.listingCategory.deleteMany({ where: { listingId } });
  if (input.categoryIds.length) {
    await tx.listingCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({ listingId, categoryId })),
      skipDuplicates: true,
    });
  }
  await tx.listingRegion.deleteMany({ where: { listingId } });
  if (input.regionIds.length) {
    await tx.listingRegion.createMany({
      data: input.regionIds.map((regionId) => ({ listingId, regionId })),
      skipDuplicates: true,
    });
  }
  await tx.listingSection.deleteMany({ where: { listingId } });
  if (input.sectionIds.length) {
    await tx.listingSection.createMany({
      data: input.sectionIds.map((sectionId, i) => ({ listingId, sectionId, order: i })),
      skipDuplicates: true,
    });
  }
  await tx.listingSubTopic.deleteMany({ where: { listingId } });
  if (input.subTopicIds.length) {
    await tx.listingSubTopic.createMany({
      data: input.subTopicIds.map((templateId, i) => ({ listingId, templateId, order: i })),
      skipDuplicates: true,
    });
  }
}

/** Create a new Company Listing (legacy landing page). */
export async function createCompanyListing(fd: FormData): Promise<ActionResult> {
  const actor = await requireSection("listings");
  const parsed = parseForm(fd);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    const slug = await uniqueSlug(parsed.slug);
    const id = `cl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    await prisma.$transaction(async (tx) => {
      await tx.listing.create({
        data: {
          id,
          tenantId: TENANT_ID,
          isLandingPage: true,
          tier: parsed.tier,
          status: parsed.status,
          title: parsed.title,
          slug,
          website: parsed.website,
          companyName: parsed.companyName,
          summary: parsed.summary,
          phone: parsed.phone,
          address: parsed.address,
          city: parsed.city,
          state: parsed.state,
          zip: parsed.zip,
          description: parsed.description,
          staff: parsed.staff,
          specialties: parsed.specialties,
          keywords: parsed.keywords,
          avatarImage: parsed.avatarImage,
          feedImage: parsed.feedImage,
          companyId: parsed.companyId,
          authorId: parsed.authorId,
          companyListingTemplateId: parsed.companyListingTemplateId,
          claimedById: parsed.authorId, // portal owner = assigned user
          spiderIgnore: parsed.spiderIgnore,
        },
      });
      await setMemberships(tx, id, parsed);
    });
    await logAudit({
      actorId: actor.id,
      action: "LISTING_CREATE",
      entity: "CompanyListing",
      entityId: id,
      reason: `Company listing "${parsed.title}" created`,
      meta: { slug, tier: parsed.tier },
    });
    revalidatePath("/admin/company-listings");
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create company page." };
  }
}

/** Update an existing Company Listing. */
export async function updateCompanyListing(id: string, fd: FormData): Promise<ActionResult> {
  const actor = await requireSection("listings");
  const parsed = parseForm(fd);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    const existing = await prisma.listing.findFirst({
      where: { id, tenantId: TENANT_ID, isLandingPage: true },
      select: { id: true, title: true, tier: true },
    });
    if (!existing) return { ok: false, error: "Company page not found." };
    const slug = await uniqueSlug(parsed.slug, id);
    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id },
        data: {
          isLandingPage: true,
          tier: parsed.tier,
          status: parsed.status,
          title: parsed.title,
          slug,
          website: parsed.website,
          companyName: parsed.companyName,
          summary: parsed.summary,
          phone: parsed.phone,
          address: parsed.address,
          city: parsed.city,
          state: parsed.state,
          zip: parsed.zip,
          description: parsed.description,
          staff: parsed.staff,
          specialties: parsed.specialties,
          keywords: parsed.keywords,
          avatarImage: parsed.avatarImage,
          feedImage: parsed.feedImage,
          companyId: parsed.companyId,
          authorId: parsed.authorId,
          companyListingTemplateId: parsed.companyListingTemplateId,
          // Keep apply-flow ownership when no user is assigned; set when chosen.
          ...(parsed.authorId ? { claimedById: parsed.authorId } : {}),
          spiderIgnore: parsed.spiderIgnore,
        },
      });
      await setMemberships(tx, id, parsed);
    });
    await logAudit({
      actorId: actor.id,
      action: "LISTING_UPDATE",
      entity: "CompanyListing",
      entityId: id,
      reason: `Company listing "${parsed.title}" updated`,
      meta: { slug, tier: parsed.tier },
    });
    revalidatePath("/admin/company-listings");
    revalidatePath(`/admin/company-listings/${id}/edit`);
    revalidatePath("/", "layout");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save company page." };
  }
}

/** Delete a Company Listing (membership joins first — RESTRICT FKs). */
export async function deleteCompanyListing(id: string, _formData: FormData): Promise<void> {
  const actor = await requireSection("listings");
  let errorMsg: string | null = null;
  try {
    const listing = await prisma.listing.findFirst({
      where: { id, tenantId: TENANT_ID, isLandingPage: true },
      select: { id: true, title: true },
    });
    if (!listing) {
      errorMsg = "Company page not found.";
    } else {
      await prisma.$transaction([
        prisma.listingCategory.deleteMany({ where: { listingId: id } }),
        prisma.listingRegion.deleteMany({ where: { listingId: id } }),
        prisma.listingSection.deleteMany({ where: { listingId: id } }),
        prisma.listingSubTopic.deleteMany({ where: { listingId: id } }),
        prisma.listing.delete({ where: { id } }),
      ]);
      await logAudit({
        actorId: actor.id,
        action: "LISTING_DELETE",
        entity: "CompanyListing",
        entityId: id,
        reason: `Company listing "${listing.title}" deleted`,
      });
      revalidatePath("/admin/company-listings");
      revalidatePath("/", "layout");
    }
  } catch {
    errorMsg = "Could not delete — this page still has related records (leads, reviews, articles).";
  }
  if (errorMsg) redirect(`/admin/company-listings?error=${encodeURIComponent(errorMsg)}`);
}

// ---------------------------------------------------------------------------
// Billing — Path A: admin sends an invoice; paid ⇒ page auto-LIVE.
// ---------------------------------------------------------------------------

/**
 * Create the setup invoice (+ optional recurring tier) for a company page and
 * email the payment link. Paid ⇒ activateListingFromInvoice flips the page LIVE.
 */
export async function sendCompanyListingInvoice(
  listingId: string,
  fd: FormData,
): Promise<ActionResult> {
  const actor = await requireSection("listings");
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, tenantId: TENANT_ID, isLandingPage: true },
    select: { id: true, title: true, companyName: true, email: true, tier: true },
  });
  if (!listing) return { ok: false, error: "Company page not found." };

  const setupAmount = str("setupAmount");
  if (!/^\d+(\.\d{1,2})?$/.test(setupAmount)) {
    return { ok: false, error: "Setup amount must be a number (e.g. 497)." };
  }
  const email = str("clientEmail") || listing.email || null;
  if (!email) {
    return { ok: false, error: "Provide a client email (or set one on the page) to send the invoice." };
  }

  // Find or create the billing client for this page's owner.
  const nameSource = listing.companyName || listing.title;
  let client = await prisma.client.findFirst({
    where: { tenantId: TENANT_ID, email },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  if (!client) {
    client = await prisma.client.create({
      data: { tenantId: TENANT_ID, email, firstName: nameSource, lastName: "(Company Page)" },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
  }

  // One-time setup invoice — the activation trigger.
  const setupInvoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      amount: new Prisma.Decimal(setupAmount),
      status: "ATTEMPTED",
      isRecurring: false,
      listingId: listing.id,
      responseMsg: "Company listing setup fee",
    },
  });

  // Optional recurring tier schedule (billed monthly via the rebill sweep).
  let tierInvoiceId: string | null = null;
  if (fd.get("tierRecurring") === "on" || fd.get("tierRecurring") === "true") {
    const tierAmount = str("tierAmount");
    if (/^\d+(\.\d{1,2})?$/.test(tierAmount)) {
      const chargeDate = new Date();
      chargeDate.setUTCMonth(chargeDate.getUTCMonth() + 1);
      const tierInvoice = await prisma.invoice.create({
        data: {
          clientId: client.id,
          amount: new Prisma.Decimal(tierAmount),
          status: "ATTEMPTED",
          isRecurring: true,
          interval: "MONTHLY",
          chargeDate,
          listingId: listing.id,
          responseMsg: `Company listing ${listing.tier} tier (monthly)`,
        },
      });
      tierInvoiceId = tierInvoice.id;
    }
  }

  const link = await createInvoicePaymentLink(setupInvoice.id).catch(() => null);
  let emailed = false;
  let emailNote: string | null = null;
  if (email) {
    const sent = await sendInvoicePaymentEmail({
      to: email,
      clientName: [client.firstName, client.lastName].filter(Boolean).join(" "),
      invoiceId: setupInvoice.id,
      amount: setupInvoice.amount.toFixed(2),
      payUrl: link?.ok ? link.url : null,
    });
    emailed = sent.ok;
    if (!sent.ok) emailNote = sent.error ?? "Could not send email.";
    else {
      await prisma.invoice.update({ where: { id: setupInvoice.id }, data: { emailSentAt: new Date() } });
    }
  }

  await logAudit({
    actorId: actor.id,
    action: "INVOICE_CREATE",
    entity: "CompanyListing",
    entityId: listing.id,
    reason: `Setup invoice $${setupAmount} created for company page${
      tierInvoiceId ? " (+ recurring tier)" : ""
    }`,
    meta: { invoiceId: setupInvoice.id, tierInvoiceId, email, linkOk: Boolean(link?.ok) },
  });

  revalidatePath(`/admin/company-listings/${listing.id}/edit`);
  revalidatePath("/admin/invoices");

  const parts = [`Setup invoice $${setupAmount} created.`];
  if (link?.ok) parts.push("Payment link ready.");
  else if (link && !link.ok) parts.push(`No payment link: ${link.error}`);
  if (email) parts.push(emailed ? `Emailed to ${email}.` : `Email failed: ${emailNote}`);
  return { ok: true, message: parts.join(" "), url: link?.ok ? link.url : undefined };
}

/** Mark a linked company-listing invoice APPROVED (manual settlement) ⇒ LIVE. */
export async function markCompanyListingInvoicePaid(
  listingId: string,
  invoiceId: string,
): Promise<ActionResult> {
  const actor = await requireSection("listings");
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, listingId },
    select: {
      id: true,
      listingId: true,
      status: true,
      stripePaymentLinkId: true,
      gatewayId: true,
    },
  });
  if (!invoice) return { ok: false, error: "Invoice not found for this page." };

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "APPROVED", paidAt: new Date() },
  });
  await deactivateInvoicePaymentLink(invoice).catch(() => false);
  await activateListingFromInvoice(invoice, "admin-mark-paid").catch(() => false);
  await logAudit({
    actorId: actor.id,
    action: "INVOICE_STATUS_OVERRIDE",
    entity: "CompanyListing",
    entityId: listingId,
    reason: `Invoice ${invoice.id} manually marked paid — page set LIVE`,
  });
  revalidatePath(`/admin/company-listings/${listingId}/edit`);
  return { ok: true, message: "Invoice marked paid — page is LIVE." };
}

/** Re-send a linked company-listing invoice's payment email. */
export async function resendCompanyListingInvoice(
  listingId: string,
  invoiceId: string,
): Promise<ActionResult> {
  const actor = await requireSection("listings");
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true },
  });
  if (!invoice || invoice.listingId !== listingId) {
    return { ok: false, error: "Invoice not found for this page." };
  }
  const to = invoice.client.email?.trim();
  if (!to) return { ok: false, error: "Client has no email address on file." };

  let payUrl = invoice.payUrl;
  if (!payUrl && invoice.status !== "APPROVED") {
    const link = await createInvoicePaymentLink(invoice.id).catch(() => null);
    if (link?.ok) payUrl = link.url;
  }
  const sent = await sendInvoicePaymentEmail({
    to,
    clientName: [invoice.client.firstName, invoice.client.lastName].filter(Boolean).join(" "),
    invoiceId: invoice.id,
    amount: invoice.amount.toFixed(2),
    payUrl,
  });
  if (!sent.ok) return { ok: false, error: sent.error ?? "Could not resend email." };

  await prisma.invoice.update({ where: { id: invoice.id }, data: { emailSentAt: new Date() } });
  await logAudit({
    actorId: actor.id,
    action: "INVOICE_EMAIL",
    entity: "CompanyListing",
    entityId: listingId,
    reason: `Invoice ${invoice.id} payment email resent to ${to}`,
  });
  return { ok: true, message: `Invoice emailed to ${to}.` };
}

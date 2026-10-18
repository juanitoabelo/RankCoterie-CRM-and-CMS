import { prisma, TENANT_ID } from "@/modules/shared";
import { readCompanyListingPaymentConfig } from "@/lib/billing/checkout";
import { companyListingTemplateOptions } from "@/app/(admin)/admin/company-listing-layouts/actions";

export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export type Option = { id: string; label: string };

export async function loadCompanyFormData() {
  const [categories, regions, sections, subTopics, companies, users, templates] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { slug: "asc" },
      select: { id: true, title: true },
    }),
    prisma.region.findMany({
      orderBy: [{ priority: "asc" }, { id: "asc" }],
      select: { id: true, state: true, stateFull: true, city: true },
    }),
    prisma.section.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: [{ order: "asc" }, { title: "asc" }],
      select: { id: true, title: true },
    }),
    prisma.contentTemplate.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.company.findMany({
      where: { tenantId: TENANT_ID },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { tenantId: TENANT_ID, active: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    companyListingTemplateOptions(),
  ]);

  return {
    siteUrl: siteUrl(),
    categories: categories.map((c) => ({ id: c.id, label: c.title })),
    regions,
    sections: sections.map((s) => ({ id: s.id, label: s.title })),
    subTopics: subTopics.map((s) => ({ id: s.id, label: s.title })),
    companies: companies.map((c) => ({ id: c.id, label: c.name })),
    users: users.map((u) => ({
      id: u.id,
      label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
    })),
    templates: templates.map((t) => ({
      id: t.id,
      label: t.isPreset ? `${t.name} (preset)` : t.name,
    })),
  };
}

/** Invoices + default setup-fee amount for a company listing's billing card. */
export async function loadCompanyListingInvoices(listingId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  const cfg = readCompanyListingPaymentConfig(tenant?.theme ?? {});
  const invoices = await prisma.invoice.findMany({
    where: { listingId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      status: true,
      isRecurring: true,
      interval: true,
      payUrl: true,
      emailSentAt: true,
      paidAt: true,
      createdAt: true,
      responseMsg: true,
      client: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  return {
    setupFeeAmount: cfg.setupFeeAmount ?? "",
    standardAmount: cfg.standardAmount ?? "97",
    premiumAmount: cfg.premiumAmount ?? "197",
    invoices,
  };
}

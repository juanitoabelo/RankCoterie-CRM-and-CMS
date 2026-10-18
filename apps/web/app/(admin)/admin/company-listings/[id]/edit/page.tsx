import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, TENANT_ID } from "@/modules/shared";
import { requireSection } from "@/modules/auth";
import { loadCompanyFormData, loadCompanyListingInvoices } from "../../data";
import CompanyListingForm, { type FormListing } from "../../components/CompanyListingForm";
import CompanyListingBillingCard from "../../components/CompanyListingBillingCard";

export const metadata: Metadata = { title: "Edit Company Page" };

export default async function EditCompanyListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSection("listings");
  const { id } = await params;
  const [listing, data, billing] = await Promise.all([
    prisma.listing.findFirst({
      where: { id, tenantId: TENANT_ID, isLandingPage: true },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        tier: true,
        email: true,
        website: true,
        companyName: true,
        summary: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        description: true,
        staff: true,
        specialties: true,
        keywords: true,
        avatarImage: true,
        feedImage: true,
        companyId: true,
        authorId: true,
        listingTemplateId: true,
        spiderIgnore: true,
        categories: { select: { categoryId: true } },
        regions: { select: { regionId: true } },
        sectionLinks: { select: { sectionId: true }, orderBy: { order: "asc" } },
        subTopicLinks: { select: { templateId: true }, orderBy: { order: "asc" } },
      },
    }),
    loadCompanyFormData(),
    loadCompanyListingInvoices(id),
  ]);
  if (!listing) notFound();

  const formListing: FormListing = {
    id: listing.id,
    title: listing.title,
    slug: listing.slug,
    status: listing.status,
    tier: listing.tier,
    website: listing.website,
    companyName: listing.companyName,
    summary: listing.summary,
    phone: listing.phone,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    description: listing.description,
    staff: listing.staff,
    specialties: Array.isArray(listing.specialties)
      ? listing.specialties.filter((s): s is string => typeof s === "string")
      : [],
    keywords: listing.keywords,
    avatarImage: listing.avatarImage,
    feedImage: listing.feedImage,
    companyId: listing.companyId,
    authorId: listing.authorId,
    companyListingTemplateId: listing.companyListingTemplateId,
    spiderIgnore: listing.spiderIgnore,
    categoryIds: listing.categories.map((c) => c.categoryId),
    regionIds: listing.regions.map((r) => r.regionId),
    sectionIds: listing.sectionLinks.map((s) => s.sectionId),
    subTopicIds: listing.subTopicLinks.map((s) => s.templateId),
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Admin / Directory /{" "}
        <Link href="/admin/company-listings" className="text-zinc-700 hover:underline">
          Company Listings
        </Link>{" "}
        / <span className="text-zinc-700">Edit</span>
      </p>
      <div className="max-w-3xl space-y-6">
        <CompanyListingForm listing={formListing} {...data} />
        <CompanyListingBillingCard
          listingId={listing.id}
          tier={listing.tier}
          defaultSetupAmount={billing.setupFeeAmount}
          defaultEmail={listing.email ?? ""}
          defaultTierAmount={listing.tier === "PREMIUM" ? billing.premiumAmount : billing.standardAmount}
          invoices={billing.invoices}
        />
      </div>
    </div>
  );
}

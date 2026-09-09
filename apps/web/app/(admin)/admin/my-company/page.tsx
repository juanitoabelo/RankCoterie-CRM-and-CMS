import { getCompany } from "./actions";
import CompanyAccordion from "./company-accordion";

export const revalidate = 0;

export default async function MyCompanyAdminPage() {
  const company = await getCompany();

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">My Company</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Edit {company?.name ?? "Company"} Information
      </h1>

      <div className="mt-8 max-w-2xl">
        <CompanyAccordion
          company={{
            name: company?.name ?? "",
            tagline: company?.tagline,
            description: company?.description,
            businessHours: (company?.businessHours as Record<string, { opens: string; closes: string }> | null) ?? null,
            industryCategory: company?.industryCategory,
            industrySubCategory: company?.industrySubCategory,
            industrySubSubCategory: company?.industrySubSubCategory,
            audiencePersona1: company?.audiencePersona1,
            audiencePersona2: company?.audiencePersona2,
            audiencePersona3: company?.audiencePersona3,
            languagesSpoken: company?.languagesSpoken,
            additionalLanguage: company?.additionalLanguage,
            ga4: company?.ga4,
            gtm: company?.gtm,
            fbPixel: company?.fbPixel,
            searchConsole: company?.searchConsole,
            gscVerificationTag: company?.gscVerificationTag,
            brandColor: company?.brandColor,
            logoAssetId: company?.logoAssetId,
            socialMedia: (company?.socialMedia as Record<string, string | null> | null) ?? null,
            contactInfo: (company?.contactInfo as Record<string, string | null> | null) ?? null,
          }}
        />
      </div>
    </div>
  );
}

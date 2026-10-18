import { getCompanyListingReportsData } from "./actions";
import CompanyListingReportsClient from "./CompanyListingReportsClient";
import type { PaginationParams } from "./types";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function CompanyListingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortField?: string;
    sortDirection?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const paginationParams: PaginationParams = {
    page: params.page ? Math.max(1, parseInt(params.page, 10)) : 1,
    pageSize: params.pageSize ? Math.min(100, Math.max(1, parseInt(params.pageSize, 10))) : 25,
    sortField: params.sortField as PaginationParams["sortField"],
    sortDirection: params.sortDirection as PaginationParams["sortDirection"],
    search: params.search,
  };
  const data = await getCompanyListingReportsData(paginationParams);
  return <CompanyListingReportsClient initialData={data} />;
}

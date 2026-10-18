import { getListingReportsData } from "./actions";
import ListingReportsClient from "./ListingReportsClient";
import type { PaginationParams } from "./types";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function ListingReportsPage({
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
  const data = await getListingReportsData(paginationParams);
  return <ListingReportsClient initialData={data} />;
}

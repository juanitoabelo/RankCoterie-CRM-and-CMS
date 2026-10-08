import { getListingReportsData } from "./actions";
import ListingReportsClient from "./ListingReportsClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function ListingReportsPage() {
  const data = await getListingReportsData();
  return <ListingReportsClient initialData={data} />;
}

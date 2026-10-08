import { getEcommerceReportData } from "./actions";
import EcommerceReportsClient from "./EcommerceReportsClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function EcommerceReportsPage() {
  const data = await getEcommerceReportData();
  return <EcommerceReportsClient initialData={data} />;
}
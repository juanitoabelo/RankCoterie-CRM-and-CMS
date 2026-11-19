import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmForecastData } from "@/modules/crm/forecast-queries";
import ForecastChartsClient from "./ForecastChartsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Forecasting | CRM" };

export default async function CrmForecastingPage() {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const data = await getCrmForecastData(access, { months: 6 });

  return <ForecastChartsClient {...data} />;
}

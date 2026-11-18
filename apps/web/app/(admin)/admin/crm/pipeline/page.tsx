import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { getCrmPipeline } from "@/modules/crm/queries";
import { FlashBanner } from "@/components/admin/FlashBanner";
import PipelineBoard from "./PipelineBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Pipeline | Admin" };

export default async function CrmPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const { error, ok } = await searchParams;
  const { stages, settings } = await getCrmPipeline(access);
  return (
    <div>
      <FlashBanner error={error} ok={ok} />
      <PipelineBoard initialStages={stages} staleDays={settings.staleDealDays} />
    </div>
  );
}

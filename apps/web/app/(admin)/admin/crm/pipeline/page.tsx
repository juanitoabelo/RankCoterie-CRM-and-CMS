import { requireSection } from "@/modules/auth";
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
  await requireSection("crm");
  const { error, ok } = await searchParams;
  const { stages, settings } = await getCrmPipeline();
  return (
    <div>
      <FlashBanner error={error} ok={ok} />
      <PipelineBoard initialStages={stages} staleDays={settings.staleDealDays} />
    </div>
  );
}

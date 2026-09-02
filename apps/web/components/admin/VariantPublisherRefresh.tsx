"use client";

import { useRouter } from "next/navigation";
import VariantPublisher, {
  type TemplateOption,
} from "@/components/admin/VariantPublisher";
import type { PickerRegion } from "@/components/regions/RegionPicker";

export default function VariantPublisherRefresh({
  templates,
  regions,
}: {
  templates: TemplateOption[];
  regions: PickerRegion[];
}) {
  const router = useRouter();

  return (
    <VariantPublisher
      templates={templates}
      regions={regions}
      onPublished={() => router.refresh()}
    />
  );
}

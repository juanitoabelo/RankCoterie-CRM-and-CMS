import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings, ProductTemplateData } from "./types";
import { DEFAULT_CONTAINER_SETTINGS } from "./types";

export function parseProductTemplateData(data: string | null): ProductTemplateData {
  if (!data) return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
  try {
    const parsed: unknown = JSON.parse(data);
    if (Array.isArray(parsed)) {
      return { blocks: parsed as Block[], containerSettings: DEFAULT_CONTAINER_SETTINGS };
    }
    if (!parsed || typeof parsed !== "object") {
      return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
    }
    const record = parsed as { blocks?: unknown; containerSettings?: unknown };
    return {
      blocks: Array.isArray(record.blocks) ? record.blocks as Block[] : [],
      containerSettings: {
        ...DEFAULT_CONTAINER_SETTINGS,
        ...(record.containerSettings && typeof record.containerSettings === "object"
          ? record.containerSettings as Partial<ContainerSettings>
          : {}),
      },
    };
  } catch {
    return { blocks: [], containerSettings: DEFAULT_CONTAINER_SETTINGS };
  }
}

export function serializeProductTemplateData(
  blocks: Block[],
  containerSettings: ContainerSettings,
): string {
  return JSON.stringify({ blocks, containerSettings });
}

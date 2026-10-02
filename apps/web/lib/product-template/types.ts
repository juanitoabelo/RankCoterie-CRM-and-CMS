import type { Block } from "@/lib/page-builder/types";

export interface ContainerSettings {
  width?: "boxed" | "full";
  maxWidth?: number;
}

export const DEFAULT_CONTAINER_SETTINGS: ContainerSettings = {
  width: "boxed",
  maxWidth: 1200,
};

export interface ProductTemplateData {
  blocks: Block[];
  containerSettings: ContainerSettings;
}
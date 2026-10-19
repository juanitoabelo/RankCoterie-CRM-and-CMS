import type { Block } from "@/lib/page-builder/types";
import type { ContentPageKind, ContainerSettings } from "@/lib/content-page-template/types";
import {
  updateContentPageTemplateBlocksAction,
  listContentPageTemplateRevisionsAction,
  restoreContentPageTemplateRevisionAction,
  updateContentPageTemplateMetaAction,
} from "@/modules/content-page-template/actions";
import { ThemeColorsProvider } from "@/components/admin/page-builder/ThemeColorsProvider";
import ContentPageTemplateBuilder from "./ContentPageTemplateBuilder";

export default function ContentPageTemplateEditView({
  id,
  name,
  kind,
  layout,
  isDefault,
  blocks,
  containerSettings,
  themeColors,
}: {
  id: string;
  name: string;
  kind: ContentPageKind;
  layout: "FULLWIDTH" | "SIDEBAR";
  isDefault: boolean;
  blocks: Block[];
  containerSettings: ContainerSettings;
  themeColors: Array<{ key: string; label: string; color: string }>;
}) {
  const saveBlocks = async (
    templateId: string,
    blocksJson: string,
    opts?: { createRevision?: boolean },
  ) => {
    "use server";
    return updateContentPageTemplateBlocksAction(templateId, blocksJson, opts);
  };

  const loadRevisions = async (templateId: string) => {
    "use server";
    return listContentPageTemplateRevisionsAction(templateId);
  };

  const restore = async (templateId: string, revisionId: string) => {
    "use server";
    return restoreContentPageTemplateRevisionAction(templateId, revisionId);
  };

  return (
    <ThemeColorsProvider colors={themeColors}>
      <ContentPageTemplateBuilder
        kind={kind}
        templateId={id}
        templateName={name}
        templateLayout={layout}
        initialBlocks={blocks}
        initialContainerSettings={containerSettings}
        isDefault={isDefault}
        themeColors={themeColors}
        onSave={saveBlocks}
        onListRevisions={loadRevisions}
        onRestoreRevision={restore}
        onSaveMeta={updateContentPageTemplateMetaAction}
      />
    </ThemeColorsProvider>
  );
}

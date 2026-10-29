"use client";

import type { Block } from "@/lib/page-builder/types";
import type { ContainerSettings, ContentPageKind } from "@/lib/content-page-template/types";
import type {
  ContentPageBindingData,
  CpGeoWidget,
  CpSectionItem,
  CpSubTopicItem,
  CpTopicLink,
} from "@/lib/content-page-template/bindings";
import ContentPageTemplateRenderer, {
  type ContentPageContextValue,
} from "./ContentPageTemplateRenderer";

const TOPIC_SAMPLE_BINDING: ContentPageBindingData = {
  page: {
    title: "Adoption & Foster Care",
    slug: "adoption-foster-care",
    description:
      "<p>This is sample Topic content, shown here so you can preview the single-page template as visitors will see it. Use Structure Display to select blocks and edit their settings — changes appear here in the visual preview.</p>",
    author: "Rank Coterie Editorial",
    metaDesc: "A sample meta description for previewing your Topic template.",
    seoTitle: "Sample Topic SEO title",
  },
  pageUrl: "/topic/adoption-foster-care/",
  heroImage: "",
  heroImageAlt: "Sample Topic image",
  geo: {
    title: "Wilderness Therapy Programs",
    slug: "wilderness-therapy",
    description: "<p>Sample geo category description.</p>",
    url: "/g/wilderness-therapy/",
  },
  sectionsCount: 3,
  subtopicsCount: 4,
  geoStatesCount: 6,
};

const SUBTOPIC_SAMPLE_BINDING: ContentPageBindingData = {
  page: {
    title: "Wilderness Therapy for Troubled Teen Girls",
    slug: "wilderness-therapy-for-troubled-teen-girls",
    body:
      "<p>This is sample SubTopic body content, shown here so you can preview the single-page template as visitors will see it. Use Structure Display to select blocks and edit their settings — changes appear here in the visual preview.</p>",
    author: "Rank Coterie Editorial",
    metaDesc: "A sample meta description for previewing your SubTopic template.",
    seoTitle: "Sample SubTopic SEO title",
  },
  pageUrl: "/subtopic/wilderness-therapy-for-troubled-teen-girls/",
  heroImage: "",
  heroImageAlt: "Sample SubTopic image",
  topic: {
    title: "Adoption & Foster Care",
    slug: "adoption-foster-care",
    url: "/topic/adoption-foster-care/",
  },
  sectionsCount: 3,
};

const SAMPLE_SECTIONS: CpSectionItem[] = [
  {
    title: "What is this about?",
    content: "<p>A sample section body, rendered with the live sections list.</p>",
  },
  {
    title: "What to look for",
    content: "<p>A second sample section so you can see the stacked layout.</p>",
  },
  {
    title: "Next steps",
    content: "<p>A third sample section to fill out the preview.</p>",
  },
];

const SAMPLE_GEO: CpGeoWidget = {
  title: "Wilderness Therapy Programs",
  slug: "wilderness-therapy",
  description: "<p>Sample geo category description used in the visual preview.</p>",
  url: "/g/wilderness-therapy/",
  states: [
    { slug: "Texas-TX", stateFull: "Texas", url: "/g/wilderness-therapy/Texas-TX/" },
    { slug: "California-CA", stateFull: "California", url: "/g/wilderness-therapy/California-CA/" },
    { slug: "Utah-UT", stateFull: "Utah", url: "/g/wilderness-therapy/Utah-UT/" },
    { slug: "North-Carolina-NC", stateFull: "North Carolina", url: "/g/wilderness-therapy/North-Carolina-NC/" },
    { slug: "Florida-FL", stateFull: "Florida", url: "/g/wilderness-therapy/Florida-FL/" },
    { slug: "Oregon-OR", stateFull: "Oregon", url: "/g/wilderness-therapy/Oregon-OR/" },
  ],
};

const SAMPLE_SUBTOPICS: CpSubTopicItem[] = [
  { id: "st1", title: "Wilderness Therapy for Teen Girls", slug: "st-1", url: "/subtopic/wilderness-therapy-for-teen-girls/", excerpt: "A sample SubTopic summary shown in the visual preview." },
  { id: "st2", title: "Residential Treatment Options", slug: "st-2", url: "/subtopic/residential-treatment-options/", excerpt: "A second sample SubTopic with its own summary text." },
  { id: "st3", title: "Therapeutic Boarding Schools", slug: "st-3", url: "/subtopic/therapeutic-boarding-schools/", excerpt: "A third sample SubTopic to fill out the grid." },
  { id: "st4", title: "Step-Down & Aftercare", slug: "st-4", url: "/subtopic/step-down-aftercare/", excerpt: "A fourth sample SubTopic summarising the aftercare path." },
];

const SAMPLE_TOPIC_LINK: CpTopicLink = {
  title: "Adoption & Foster Care",
  slug: "adoption-foster-care",
  url: "/topic/adoption-foster-care/",
  description: "The sample parent Topic this SubTopic belongs to.",
};

/** Shared sample context — also powers live previews in Structure Display. */
export function getCpPreviewSample(
  kind: ContentPageKind,
): Omit<ContentPageContextValue, "viewport"> {
  return kind === "topic"
    ? {
        kind,
        binding: TOPIC_SAMPLE_BINDING,
        sections: SAMPLE_SECTIONS,
        geo: SAMPLE_GEO,
        subtopics: SAMPLE_SUBTOPICS,
        topic: null,
      }
    : {
        kind,
        binding: SUBTOPIC_SAMPLE_BINDING,
        sections: SAMPLE_SECTIONS,
        geo: null,
        subtopics: [],
        topic: SAMPLE_TOPIC_LINK,
      };
}

export default function ContentPageTemplateVisualPreview({
  kind,
  blocks,
  containerSettings,
  viewport,
}: {
  kind: ContentPageKind;
  blocks: Block[];
  containerSettings: ContainerSettings;
  viewport: "desktop" | "tablet" | "mobile";
}) {
  const sample = getCpPreviewSample(kind);

  return (
    <div
      className={`min-h-[600px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm ${
        viewport === "mobile"
          ? "mx-auto w-full max-w-[390px]"
          : viewport === "tablet"
            ? "mx-auto w-full max-w-[768px]"
            : "w-full"
      }`}
    >
      <ContentPageTemplateRenderer
        blocks={blocks}
        containerSettings={containerSettings}
        kind={kind}
        binding={sample.binding}
        sections={sample.sections}
        geo={sample.geo}
        subtopics={sample.subtopics}
        topic={sample.topic}
        viewport={viewport}
      />
    </div>
  );
}

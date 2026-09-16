export type ReadingSettings = {
  homepageDisplays: "latest" | "static";
  homepagePageId: string | null;
  postsPageId: string | null;
  postsPerPage: number;
  feedsPerPage: number;
  feedFormat: "full" | "excerpt";
  searchEngineVisibility: "visible" | "hidden";
};

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  homepageDisplays: "latest",
  homepagePageId: null,
  postsPageId: null,
  postsPerPage: 10,
  feedsPerPage: 10,
  feedFormat: "full",
  searchEngineVisibility: "visible",
};

export type PageOption = {
  id: string;
  name: string;
  slug: string;
  title: string;
  status: string;
};

export type ActionResult = { ok: true } | { ok: false; error: string };

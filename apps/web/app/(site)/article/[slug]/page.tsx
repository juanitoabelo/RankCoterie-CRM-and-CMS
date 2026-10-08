import { permanentRedirect } from "next/navigation";

/**
 * Legacy single-post URL. Articles now live at `/{slug}` (root level);
 * keep this route as a 308 redirect so existing links keep working.
 */
export default async function LegacyArticleRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}

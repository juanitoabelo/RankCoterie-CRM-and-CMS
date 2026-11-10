import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CustomPostTypeArchiveContent, getCustomPostTypeArchive } from "../../components/CustomPostTypeArchive";

export const revalidate = 0;

type Props = { params: Promise<{ type: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const postType = await getCustomPostTypeArchive(type);
  if (!postType || !postType.isPublic || !postType.hasArchive) return { title: "Page not found" };
  return {
    title: postType.archivesLabel || postType.pluralLabel || postType.name,
    description: postType.description ?? undefined,
  };
}

export default async function CustomPostTypeArchive({ params }: Props) {
  const { type } = await params;
  const postType = await getCustomPostTypeArchive(type);
  if (!postType || !postType.isPublic || !postType.hasArchive) notFound();

  return <CustomPostTypeArchiveContent postType={postType} />;
}

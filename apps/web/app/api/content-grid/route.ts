import { NextResponse } from "next/server";
import { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/directory/prismaCatalog";
import { stripHtml } from "@/lib/page-builder/validate";
import { TENANT_ID } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstImageSrc(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function excerptFromHtml(
  html: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  const text = stripHtml(html ?? "");
  if (text) return text.length > 200 ? `${text.slice(0, 200).trimEnd()}…` : text;
  if (fallback) return fallback;
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") === "feeds" ? "feeds" : "articles";
  const categoryId = searchParams.get("categoryId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = Math.min(48, Math.max(1, Number(searchParams.get("perPage")) || 6));
  const order: "asc" | "desc" = searchParams.get("order") === "asc" ? "asc" : "desc";
  const skip = (page - 1) * perPage;

  if (source === "feeds") {
    const where = {
      tenantId: TENANT_ID,
      isApproved: true,
      isRejected: false,
      ...(categoryId ? { listing: { categories: { some: { categoryId } } } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.searchArticle.findMany({
        where,
        orderBy: { postDate: order },
        skip,
        take: perPage,
      }),
      prisma.searchArticle.count({ where }),
    ]);
    return NextResponse.json({
      items: rows.map((row) => ({
        id: row.id,
        type: "feed",
        title: row.title,
        excerpt: excerptFromHtml(row.body, row.metaDesc),
        url: null,
        image: row.feedImage,
        category: null,
        date: row.postDate?.toISOString() ?? null,
      })),
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    });
  }

  const where = {
    tenantId: TENANT_ID,
    status: ContentStatus.LIVE,
    ...(categoryId ? { categoryId } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.contentTemplate.findMany({
      where,
      include: { category: { select: { title: true } } },
      orderBy: { publishedAt: order },
      skip,
      take: perPage,
    }),
    prisma.contentTemplate.count({ where }),
  ]);
  return NextResponse.json({
    items: rows.map((row) => ({
      id: row.id,
      type: "article",
      title: row.title,
      excerpt: excerptFromHtml(row.body, row.metaDesc),
      url: row.slug ? `/article/${row.slug}` : null,
      image: firstImageSrc(row.body ?? ""),
      category: row.category?.title ?? null,
      date: (row.publishedAt ?? row.createdAt).toISOString(),
    })),
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  });
}
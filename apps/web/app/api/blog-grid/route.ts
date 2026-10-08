import { NextResponse } from "next/server";
import { getBlogGridPage, type BlogGridParams } from "@/modules/blog-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDERS = ["date", "title", "popular"] as const;
const SORTS = ["asc", "desc"] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const orderParam = searchParams.get("order");
  const sortParam = searchParams.get("sort");
  const order = ORDERS.includes(orderParam as (typeof ORDERS)[number])
    ? (orderParam as BlogGridParams["orderBy"])
    : "date";
  const sort = SORTS.includes(sortParam as (typeof SORTS)[number])
    ? (sortParam as BlogGridParams["sortOrder"])
    : "desc";

  const params: BlogGridParams = {
    categoryId: searchParams.get("category") ?? "",
    filterCategoryIds: (searchParams.get("filterCategories") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    page: Math.max(1, Number(searchParams.get("page")) || 1),
    perPage: Math.min(48, Math.max(1, Number(searchParams.get("perPage")) || 9)),
    orderBy: order,
    sortOrder: sort,
    search: searchParams.get("q") ?? "",
  };

  try {
    const page = await getBlogGridPage(params);
    return NextResponse.json(page);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load posts." },
      { status: 500 },
    );
  }
}

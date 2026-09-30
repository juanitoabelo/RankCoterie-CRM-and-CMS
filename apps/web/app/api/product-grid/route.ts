import { NextResponse } from "next/server";
import { getProductGridPage, type ProductGridParams } from "@/modules/ecommerce/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDERS = ["price", "date", "popular", "name", "menuOrder"] as const;
const SORTS = ["asc", "desc"] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const orderParam = searchParams.get("order");
  const sortParam = searchParams.get("sort");
  const order = ORDERS.includes(orderParam as (typeof ORDERS)[number])
    ? (orderParam as ProductGridParams["orderBy"])
    : "date";
  const sort = SORTS.includes(sortParam as (typeof SORTS)[number])
    ? (sortParam as ProductGridParams["sortOrder"])
    : "desc";

  const params: ProductGridParams = {
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
    minPrice: Math.max(0, Number(searchParams.get("minPrice")) || 0),
    maxPrice: Math.max(0, Number(searchParams.get("maxPrice")) || 0),
    inStockOnly: searchParams.get("inStock") === "1",
  };

  try {
    const page = await getProductGridPage(params);
    return NextResponse.json(page);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load products." },
      { status: 500 },
    );
  }
}

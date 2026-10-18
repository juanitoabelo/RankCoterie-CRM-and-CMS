import { NextResponse } from "next/server";
import {
  getSliderItems,
  isSliderSource,
  type SliderOrderBy,
  type SliderQuery,
} from "@/modules/content-slider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDERS: SliderOrderBy[] = ["date", "title", "popular", "price", "rating"];

function parseIds(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? "";
  if (!isSliderSource(source)) {
    return NextResponse.json({ error: "Unknown slider source." }, { status: 400 });
  }

  const orderParam = searchParams.get("orderBy");
  const query: SliderQuery = {
    source,
    categoryIds: parseIds(searchParams.get("categoryIds")),
    sectionIds: parseIds(searchParams.get("sectionIds")),
    topicIds: parseIds(searchParams.get("topicIds")),
    limit: Math.max(1, Number(searchParams.get("limit")) || 9),
    orderBy: ORDERS.includes(orderParam as SliderOrderBy) ? (orderParam as SliderOrderBy) : "date",
    sortOrder: searchParams.get("sortOrder") === "asc" ? "asc" : "desc",
  };

  try {
    const items = await getSliderItems(query);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load slider content." },
      { status: 500 },
    );
  }
}

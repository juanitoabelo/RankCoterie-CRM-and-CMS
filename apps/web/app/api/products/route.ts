import { NextResponse } from "next/server";
import { getProductsByIds } from "@/modules/ecommerce/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/products?ids=id1,id2,... — public published products for the wishlist. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await getProductsByIds(ids);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load products." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth";
import {
  addWishlistProduct,
  listWishlistForUser,
  removeWishlistProduct,
  syncWishlistForUser,
} from "@/modules/ecommerce/wishlist";

async function userId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await listWishlistForUser(id);
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { items?: unknown } | null;
  const items = await syncWishlistForUser(id, body?.items ?? body);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as unknown;
  const entry = await addWishlistProduct(id, body);
  if (!entry) return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  return NextResponse.json({ item: entry }, { status: 201 });
}

export async function DELETE(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") ?? "";
  const rawVariant = url.searchParams.get("variantId");
  if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  await removeWishlistProduct(id, productId, rawVariant || null);
  return NextResponse.json({ ok: true });
}

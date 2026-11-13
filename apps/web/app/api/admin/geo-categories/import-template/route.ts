import { NextResponse } from "next/server";
import { canAccessSectionForUser, getApiUser } from "@/modules/auth";
import { toCsv } from "@/lib/admin/csv";
import { GEO_IMPORT_COLUMNS } from "@/lib/admin/geo-category-import";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Header-only CSV template for the GeoCategory bulk importer. */
export async function GET() {
  const user = await getApiUser();
  if (!user || !(await canAccessSectionForUser(user, "categories"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const csv = toCsv<Record<string, never>>(
    [],
    GEO_IMPORT_COLUMNS.map((col) => ({ key: col.header, label: col.header })),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      'Content-Disposition': 'attachment; filename="geocategories-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}

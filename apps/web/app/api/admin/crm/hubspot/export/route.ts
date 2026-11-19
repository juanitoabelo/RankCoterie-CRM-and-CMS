import { NextRequest } from "next/server";
import { requireSection } from "@/modules/auth";
import { logAudit } from "@/lib/audit";
import { getHubspotExportCsv } from "@/modules/crm/hubspot-io";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireSection("crm");
  const type = request.nextUrl.searchParams.get("type") ?? "contacts";
  try {
    const { csv, filename } = await getHubspotExportCsv(type);
    await logAudit({
      action: "CRM_EXPORT",
      entity: "CrmExport",
      entityId: type,
      actorId: user.id,
      reason: `Exported HubSpot ${type}`,
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Export failed." },
      { status: 400 },
    );
  }
}

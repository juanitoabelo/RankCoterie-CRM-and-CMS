import { NextRequest } from "next/server";
import { WEBHOOK_EVENT_CATALOG } from "@/lib/webhooks/events";
import { apiSuccess, authenticateCrmApi } from "@/modules/api/crm-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await authenticateCrmApi(request, "crm:read");
  if (!auth.ok) return auth.response;
  return apiSuccess({ events: WEBHOOK_EVENT_CATALOG });
}

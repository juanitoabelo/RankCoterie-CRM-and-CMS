import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { prisma, TENANT_ID } from "@/modules/shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "CRM Audit Trail | Admin" };

const CRM_AUDIT_ACTIONS = [
  "LEAD_ASSIGN",
  "LEAD_CONVERT",
  "LEAD_MERGE",
  "CLIENT_MERGE",
  "DEAL_CREATE",
  "DEAL_UPDATE",
  "DEAL_DELETE",
  "DEAL_BULK_UPDATE",
  "DEAL_BULK_DELETE",
];

export default async function CrmAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  const { q } = await searchParams;
  const search = q?.trim() || "";

  const where: Prisma.AuditLogWhereInput = {
    tenantId: TENANT_ID,
    ...(access.isAdmin ? {} : { actorId: user.id }),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: "insensitive" } },
            { entity: { contains: search, mode: "insensitive" } },
            { entityId: { contains: search, mode: "insensitive" } },
            { reason: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    AND: [
      {
        OR: [
          { action: { startsWith: "CRM_" } },
          { action: { in: CRM_AUDIT_ACTIONS } },
          ...(search ? [{ action: { contains: search, mode: "insensitive" } }] : []),
        ],
      },
    ],
  };

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const actorIds = [...new Set(rows.map((row) => row.actorId).filter(Boolean))] as string[];
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { tenantId: TENANT_ID, id: { in: actorIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
    : [];
  const actorById = new Map(
    actors.map((actor) => [
      actor.id,
      `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() || actor.email,
    ]),
  );

  return (
    <div>
      <Link href="/admin/crm/settings" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← CRM settings
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900">CRM audit trail</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {access.isAdmin ? "All CRM changes in this workspace" : "Your CRM changes"}, newest first
        (latest 100).
      </p>

      <form className="mt-5 flex gap-2" method="get">
        <input
          name="q"
          defaultValue={search}
          placeholder="Search action, entity, or ID"
          className="w-full max-w-md rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <button className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white">Search</button>
      </form>

      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-100 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                  {row.createdAt.toLocaleString()}
                </td>
                <td className="px-3 py-2 font-medium text-zinc-800">{row.action}</td>
                <td className="px-3 py-2 text-zinc-600">
                  {row.entity}
                  <span className="block max-w-xs truncate text-xs text-zinc-400">
                    {row.entityId}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-600">
                  {row.actorId ? actorById.get(row.actorId) ?? row.actorId : "system"}
                </td>
                <td className="px-3 py-2 text-zinc-600">{row.reason ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-zinc-400">
                  No CRM audit entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/directory/prismaCatalog";
import { TENANT_ID } from "@/lib/tenant";

export type VerificationUser = {
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type VerificationUserRef = {
  requestedById: string;
  reviewedById: string | null;
};

/**
 * VerificationRequest stores requester/reviewer IDs, not relations. Resolve
 * those IDs in one tenant-scoped query so admin views can show user details.
 */
export async function attachVerificationUsers<T extends VerificationUserRef>(
  rows: T[],
): Promise<(T & { requestedBy: VerificationUser | null; reviewedBy: VerificationUser | null })[]> {
  const ids = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.requestedById, row.reviewedById])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (ids.length === 0) {
    return rows.map((row) => ({ ...row, requestedBy: null, reviewedBy: null }));
  }

  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID, id: { in: ids } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const byId = new Map(
    users.map((user) => [
      user.id,
      { email: user.email, firstName: user.firstName, lastName: user.lastName },
    ]),
  );

  return rows.map((row) => ({
    ...row,
    requestedBy: byId.get(row.requestedById) ?? null,
    reviewedBy: row.reviewedById ? byId.get(row.reviewedById) ?? null : null,
  }));
}

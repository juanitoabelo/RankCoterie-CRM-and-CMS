import { prisma } from "@/lib/directory/prismaCatalog";
import { addExclusionForm, deactivateExclusionForm } from "./actions";

export const revalidate = 0;

export default async function ExclusionsAdminPage() {
  const rows = await prisma.excludedCompany.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">Exclusions</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
        Company exclusions (suppression list)
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Suppressed companies never render anywhere — category pages, region pages,
        feeds, search, sitemap. Matches by exact domain key or case-insensitive
        company-name substring.
      </p>

      <form action={addExclusionForm} className="mt-8 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-medium text-zinc-900">Add exclusion</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            name="companyName"
            placeholder="Company name *"
            required
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="domainKey"
            placeholder="Domain key (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="reason"
            placeholder="Reason (optional)"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add to suppression list
        </button>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Company</th>
              <th className="px-4 py-2.5">Domain key</th>
              <th className="px-4 py-2.5">Reason</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Added</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  No exclusions yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={r.isActive ? "" : "opacity-50"}>
                <td className="px-4 py-3 font-medium text-zinc-900">{r.companyName}</td>
                <td className="px-4 py-3 text-zinc-600">{r.domainKey ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{r.reason ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.isActive ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {r.isActive ? "Suppressed" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {r.createdAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">
                  {r.isActive && (
                    <form action={deactivateExclusionForm.bind(null, r.id)}>
                      <button
                        type="submit"
                        className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
                      >
                        Remove
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
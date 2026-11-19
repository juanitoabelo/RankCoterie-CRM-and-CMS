import Link from "next/link";
import { requireSection } from "@/modules/auth";
import HubspotImportForm from "./HubspotImportForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Import & Export | CRM" };

const exportLinks = [
  { type: "contacts", label: "Contacts" },
  { type: "deals", label: "Deals" },
  { type: "engagements", label: "Engagements" },
];

export default async function CrmImportExportPage() {
  await requireSection("crm");

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Import &amp; export</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Move contacts, deals, and activity between Rank Coterie and HubSpot using CSV files.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Import from HubSpot
          </h2>
          <div className="mt-3">
            <HubspotImportForm />
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Export for HubSpot
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {exportLinks.map((item) => (
              <Link
                key={item.type}
                href={`/api/admin/crm/hubspot/export?type=${item.type}`}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Download {item.label}
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Exports use HubSpot-compatible column names and can be re-imported after mapping.
          </p>
        </section>
      </div>
    </div>
  );
}

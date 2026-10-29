import type { Metadata } from "next";
import { getEmailStatus, getEmailTemplates } from "./actions";
import EmailSettingsForm from "./components/EmailSettingsForm";
import EmailTemplatesSection from "./components/EmailTemplatesSection";

export const metadata: Metadata = { title: "Email Settings" };

export default async function EmailSettingsPage() {
  const [status, templates] = await Promise.all([getEmailStatus(), getEmailTemplates()]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Email Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure which email services Rank Coterie may use for transactional email (invoice links,
          orders, claims). Enable one or more providers and set the priority order — if the
          first provider hits its daily/monthly quota, the next one takes over automatically.
        </p>
      </div>
      <EmailSettingsForm initial={status} />
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Email templates</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Customize the message content for each transactional email with placeholders like {"{client_name}"} and {"{pay_link}"}.
        </p>
      </div>
      <EmailTemplatesSection templates={templates} />
    </div>
  );
}

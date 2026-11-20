import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSection } from "@/modules/auth";
import { getCrmAccessForUser } from "@/modules/crm/access";
import { FlashBanner } from "@/components/admin/FlashBanner";
import { getLiveChatSettings } from "@/modules/live-chat/settings";
import { saveLiveChatSettings } from "@/modules/live-chat/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Live Chat | Admin" };

const inputCls = "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";
const selectCls = "mt-1 w-full rounded-lg border border-zinc-300 px-2 py-2 text-sm";

export default async function LiveChatPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const user = await requireSection("crm");
  const access = await getCrmAccessForUser(user);
  if (!access.isAdmin) redirect("/admin/crm?error=Only+CRM+admins+can+manage+live+chat.");
  const { error, ok } = await searchParams;
  const settings = await getLiveChatSettings();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-500"><Link href="/admin/crm" className="hover:underline">Admin / CRM</Link> / Live chat</p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Live chat</h1>
        <p className="mt-1 text-sm text-zinc-500">Show a site chat widget that creates a CRM lead when a visitor sends a message.</p>
      </div>
      <FlashBanner error={error} ok={ok} />

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <form action={saveLiveChatSettings} className="grid gap-4">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
            Enable the live chat widget on the public site
          </label>
          <label className="block text-sm text-zinc-600">
            Button / panel title
            <input name="title" required maxLength={80} defaultValue={settings.title} className={inputCls} />
          </label>
          <label className="block text-sm text-zinc-600">
            Greeting
            <textarea name="greeting" required rows={3} maxLength={400} defaultValue={settings.greeting} className={inputCls} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-zinc-600">
              Position
              <select name="position" defaultValue={settings.position} className={selectCls}>
                <option value="bottom-right">Bottom right</option>
                <option value="bottom-left">Bottom left</option>
              </select>
            </label>
            <label className="block text-sm text-zinc-600">
              Accent color
              <input name="accentColor" type="color" defaultValue={settings.accentColor} className={inputCls} />
            </label>
          </div>
          <label className="block text-sm text-zinc-600">
            Lead source
            <input name="leadSource" required maxLength={80} defaultValue={settings.leadSource} className={inputCls} />
          </label>
          <div>
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Save settings</button>
          </div>
        </form>
      </section>
    </div>
  );
}

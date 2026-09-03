import { notFound } from "next/navigation";
import Link from "next/link";
import { deleteWidgetForm, getWidget, saveWidgetPlacementsForm, updateWidgetForm } from "../../actions";

export const revalidate = 0;

export default async function WidgetEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const widget = await getWidget(id);
  if (!widget) return notFound();
  return (
    <div>
      <p className="text-sm text-zinc-500">Admin / <Link href="/admin/widgets" className="text-zinc-700 hover:underline">Widget Builder</Link> / Edit</p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Edit widget</h1>
      <form action={updateWidgetForm} className="mt-6 max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
        <input type="hidden" name="id" value={widget.id} />
        <label className="block text-xs font-medium text-zinc-600">Name<input name="name" required defaultValue={widget.name} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></label>
        <label className="block text-xs font-medium text-zinc-600">Image asset ID<input name="imageAssetId" defaultValue={widget.imageAssetId ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></label>
        <label className="block text-xs font-medium text-zinc-600">Redirect URL<input name="redirectUrl" defaultValue={widget.redirectUrl ?? ""} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm" /></label>
        <label className="block text-xs font-medium text-zinc-600">HTML<textarea name="html" required rows={9} defaultValue={widget.html} className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-mono" /></label>
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-600"><input type="checkbox" name="active" defaultChecked={widget.active} />Active</label>
        <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
          <button type="submit" formAction={deleteWidgetForm} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600">Delete widget</button>
          <button type="submit" className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white">Save changes</button>
        </div>
      </form>
      <form action={saveWidgetPlacementsForm} className="mt-6 max-w-2xl space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
        <input type="hidden" name="widgetId" value={widget.id} />
        <div className="flex items-center justify-between"><h2 className="text-sm font-medium text-zinc-900">Placements</h2><span className="text-xs text-zinc-400">Rendered by slot</span></div>
        {widget.placements.map((placement) => (
          <div key={placement.id} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
            <input name="placementSlot" defaultValue={placement.slot} placeholder="SIDEBAR_TOP" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <input name="placementOrder" type="number" defaultValue={placement.order} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
            <select name="placementEnabled" defaultValue={placement.active ? "true" : "false"} className="rounded-lg border border-zinc-300 px-2 py-2 text-xs"><option value="true">Active</option><option value="false">Inactive</option></select>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
          <input name="placementSlot" placeholder="New slot" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <input name="placementOrder" type="number" defaultValue={widget.placements.length} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <select name="placementEnabled" defaultValue="true" className="rounded-lg border border-zinc-300 px-2 py-2 text-xs"><option value="true">Active</option><option value="false">Inactive</option></select>
        </div>
        <div className="flex justify-end border-t border-zinc-100 pt-3"><button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">Save placements</button></div>
      </form>
    </div>
  );
}

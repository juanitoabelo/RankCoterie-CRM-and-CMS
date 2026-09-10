import Link from "next/link";
import NewMenuForm from "./NewMenuForm";

export const revalidate = 0;

export default function NewMenuPage() {
  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <Link href="/admin/menus" className="text-zinc-700 hover:underline">Menu Builder</Link>{" "}
        / <span className="text-zinc-700">Create New Menu</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Create New Menu</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Create a new menu group and assign it to a location (Header, Footer, or Sidebar).
      </p>
      <NewMenuForm />
    </div>
  );
}

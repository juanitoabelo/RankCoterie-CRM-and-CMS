import { requireSection } from "@/modules/auth";
import CacheManager from "./components/CacheManager";

export const revalidate = 0;

export default async function CachePage() {
  await requireSection("general");

  return (
    <div>
      <p className="text-sm text-zinc-500">
        Admin / <span className="text-zinc-700">System Tools</span> /{" "}
        <span className="text-zinc-700">Clear Cache</span>
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Clear Cache</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600">
        Use this after publishing navigation, theme, font, analytics, or geo
        category changes that should appear immediately on the public site.
      </p>

      <div className="mt-8 max-w-3xl">
        <CacheManager />
      </div>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canopy Directory",
  description: "Localized business directory with paid listings and SEO-ready region pages",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold text-zinc-900">
            Canopy Directory
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-600">
            <Link href="/" className="hover:text-zinc-900">
              Home
            </Link>
            <Link href="/" className="hover:text-zinc-900">
              Directory
            </Link>
            <Link href="/apply" className="hover:text-zinc-900">
              Apply to list
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} Canopy Directory. Listings are not endorsements.
      </footer>
    </div>
  );
}
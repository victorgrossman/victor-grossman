import Link from "next/link";

import { SITE_NAME } from "@/lib/seo/site";

type Breadcrumb = { label: string; href?: string };

type SeoPageShellProps = {
  children: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
};

export function SeoPageShell({ children, breadcrumbs }: SeoPageShellProps) {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="font-serif text-xl font-bold italic text-slate-900 hover:text-blue-700"
          >
            {SITE_NAME}
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Interactive memorial →
          </Link>
        </div>
      </header>

      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav
          aria-label="Breadcrumb"
          className="border-b border-slate-100 bg-white/80"
        >
          <ol className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-6 py-3 text-sm text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-blue-600">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-800">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-slate-500">
          <p>
            Official memorial archive for Victor Grossman (Stephen Wechsler,
            1928–2025) — journalist, author, and Berlin Bulletin writer.{" "}
            <Link href="/" className="text-blue-600 hover:underline">
              Return to victorgrossman.com
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

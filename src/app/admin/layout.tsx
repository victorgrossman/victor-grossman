import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./_components/theme-toggle"
import { logoutAction } from "./_actions/auth"
import { MobileNav } from "./_components/mobile-nav"

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/tributes", label: "Tributes" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/interviews", label: "Interviews" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-border/60 bg-card/60 p-4 hidden md:flex md:flex-col">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Admin CMS</div>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            {links.map((l) => (
              <Button
                key={l.href}
                variant="ghost"
                asChild
                className="justify-start rounded-lg px-2"
              >
                <Link href={l.href}>{l.label}</Link>
              </Button>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" className="w-full justify-start">
                Logout
              </Button>
            </form>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6">
          <MobileNav />
          {children}
        </main>
      </div>
    </div>
  )
}


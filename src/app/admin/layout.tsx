import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./_components/theme-toggle"
import { logoutAction } from "./_actions/auth"
import { MobileNav } from "./_components/mobile-nav"
import { SidebarNav } from "./_components/sidebar-nav"
import { SonnerToaster } from "./_components/sonner-toaster"

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/tributes", label: "Tributes" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/interviews", label: "Interviews" },
  { href: "/admin/bulletins", label: "Bulletins" },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-500/20 via-background to-background dark:from-indigo-500/15" />

      <div className="relative mx-auto flex h-screen w-full max-w-[1600px]">
        <SonnerToaster />
        <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-card/40 p-6 lg:flex lg:flex-col">
          <SidebarNav links={links} />

          <div className="mt-auto flex flex-col gap-3">
            <ThemeToggle />
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="w-full justify-start rounded-xl px-3"
              >
                Logout
              </Button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="flex items-center justify-between p-4 sm:p-6 lg:p-8" />

          <main className="flex-1 px-4 pb-10 sm:px-6 lg:px-8">
            <MobileNav />
            <div className="rounded-2xl p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}


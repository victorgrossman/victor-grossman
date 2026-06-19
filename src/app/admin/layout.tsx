import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./_actions/auth";
import { MobileNav } from "./_components/mobile-nav";
import { SidebarNav } from "./_components/sidebar-nav";
import { SonnerToaster } from "./_components/sonner-toaster";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/tributes", label: "Tributes" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/interviews", label: "Interviews" },
  { href: "/admin/bulletins", label: "Bulletins" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user?.email ?? "";

  return (
    <div className="relative h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-500/20 via-background to-background dark:from-indigo-500/15" />

      <div className="relative mx-auto flex h-screen w-full max-w-[1600px]">
        <SonnerToaster />
        <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-card/40 p-6 lg:flex lg:flex-col max-h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0">
            <SidebarNav links={links} />
          </div>

          <div className="shrink-0 flex items-center justify-between gap-2 pt-3 border-t border-border/60 mt-3">
            <span className="truncate text-sm text-muted-foreground">
              {email}
            </span>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                className="shrink-0 px-3 text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
            <div className="rounded-2xl p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
